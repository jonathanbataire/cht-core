const _ = require('lodash/core');
const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('ContactsActions',
  function(
    $log,
    $q,
    $translate,
    ActionUtils,
    Auth,
    ContactSummary,
    ContactTypes,
    ContactViewModelGenerator,
    GlobalActions,
    LiveList,
    Selectors,
    Session,
    Settings,
    TargetAggregates,
    TasksForContact,
    TranslateFrom,
    UserSettings,
    XmlForms
  ) {
    'use strict';
    'ngInject';

    return function(dispatch) {

      const globalActions = GlobalActions(dispatch);

      const translateTitle = (key, label) => {
        return key ? $translate.instant(key) : TranslateFrom(label);
      };

      const isUnmuteForm = function(settings, formId) {
        return Boolean(settings &&
                       formId &&
                       settings.muting &&
                       settings.muting.unmute_forms &&
                       settings.muting.unmute_forms.includes(formId));
      };

      const getTitle = selected => {
        const title = (selected.type && selected.type.name_key) ||
                      'contact.profile';
        return $translate(title).catch(() => title);
      };

      // only admins can edit their own place
      const canEdit = function(selected) {
        if (Session.isAdmin()) {
          return true;
        }
        return UserSettings().then(userSettings => {
          return userSettings.facility_id &&
                 userSettings.facility_id !== selected.doc._id;
        });
      };

      const canDelete = selected => {
        return !selected.children ||
                selected.children.every(group => !group.contacts || !group.contacts.length);
      };

      const registerTasksListener = selected => {
        Auth.has('can_view_tasks')
          .then(canViewTasks => {
            if (!canViewTasks) {
              $log.debug('Not authorized to view tasks');
              return;
            }
            TasksForContact(selected)
              .then(taskDocs => {
                dispatch(
                  ActionUtils.createSingleValueAction(actionTypes.UPDATE_SELECTED_CONTACT_TASKS, 'tasks', taskDocs)
                );
              })
              .catch(err => $log.error('Failed to load tasks for contact', err));
          });
      };

      const getChildTypes = selected => {
        if (!selected.type) {
          const type = selected.doc.contact_type || selected.doc.type;
          $log.error(`Unknown contact type "${type}" for contact "${selected.doc._id}"`);
          return [];
        }
        return ContactTypes.getChildren(selected.type.id);
      };

      const getGroupedChildTypes = (childTypes) => {
        const grouped = _.groupBy(childTypes, type => type.person ? 'persons' : 'places');
        const models = [];
        if (grouped.places) {
          models.push({
            menu_key: 'Add place',
            menu_icon: 'fa-building',
            permission: 'can_create_places',
            types: grouped.places
          });
        }
        if (grouped.persons) {
          models.push({
            menu_key: 'Add person',
            menu_icon: 'fa-user',
            permission: 'can_create_people',
            types: grouped.persons
          });
        }

        return models;
      };

      function loadSelectedContactChildren(options) {
        return dispatch(function(dispatch, getState) {
          const selected = Selectors.getSelectedContact(getState());
          return ContactViewModelGenerator.loadChildren(selected, options).then(children => {
            return dispatch(ActionUtils.createSingleValueAction(
              actionTypes.RECEIVE_SELECTED_CONTACT_CHILDREN, 'children', children
            ));
          });
        });
      }

      function loadSelectedContactReports() {
        return dispatch(function(dispatch, getState) {
          const selected = Selectors.getSelectedContact(getState());
          const forms = Selectors.getForms(getState());
          return ContactViewModelGenerator.loadReports(selected, forms).then(reports => {
            return dispatch(ActionUtils.createSingleValueAction(
              actionTypes.RECEIVE_SELECTED_CONTACT_REPORTS, 'reports', reports
            ));
          });
        });
      }

      function loadSelectedContactTargetDoc(selected) {
        return TargetAggregates.getCurrentTargetDoc(selected).then(targetDoc => {
          return dispatch(ActionUtils.createSingleValueAction(
            actionTypes.RECEIVE_SELECTED_CONTACT_TARGET_DOC, 'targetDoc', targetDoc
          ));
        });
      }

      function setLoadingSelectedContact() {
        dispatch({ type: actionTypes.SET_LOADING_SELECTED_CONTACT });
      }

      function setContactsLoadingSummary(value) {
        dispatch(ActionUtils.createSingleValueAction(
          actionTypes.SET_CONTACTS_LOADING_SUMMARY, 'loadingSummary', value
        ));
      }

      const setSelectedContact = (id, { getChildPlaces=false, merge=false }={}) => {

        return dispatch(function(dispatch, getState) {

          return ContactViewModelGenerator.getContact(id, { getChildPlaces, merge })
            .then(selected => {

              const previous = Selectors.getSelectedContact(getState());
              const refreshing = (previous && previous.doc._id) === id;

              dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_CONTACT, 'selected', selected));
              globalActions.settingSelected(refreshing);

              LiveList.contacts.setSelected(selected.doc._id);
              LiveList['contact-search'].setSelected(selected.doc._id);
              setLoadingSelectedContact();
              globalActions.clearCancelCallback();
              setContactsLoadingSummary(true);
              const lazyLoadedContactData = loadSelectedContactChildren({ getChildPlaces })
                .then(loadSelectedContactReports)
                .then(() => loadSelectedContactTargetDoc(selected));
              return $q
                .all([
                  getTitle(selected),
                  canEdit(selected),
                  getChildTypes(selected)
                ])
                .then(([ title, canEdit, childTypes ]) => {
                  globalActions.setTitle(title);
                  globalActions.setRightActionBar({
                    relevantForms: [], // this disables the "New Action" button in action bar till forms load
                    sendTo: selected.type && selected.type.person ? selected.doc : '',
                    canDelete: false, // this disables the "Delete" button in action bar until children load
                    canEdit: canEdit,
                  });
                  return lazyLoadedContactData
                    .then(() => {
                      selected = Selectors.getSelectedContact(getState());
                      globalActions.setRightActionBar({ canDelete: canDelete(selected) });
                      registerTasksListener(selected);
                      return $q.all([
                        ContactSummary(selected.doc, selected.reports, selected.lineage, selected.targetDoc),
                        Settings()
                      ]);
                    })
                    .then(([ summary, settings ]) => {
                      setContactsLoadingSummary(false);
                      updateSelectedContact({ summary });
                      const options = {
                        doc: selected.doc,
                        contactSummary: summary.context,
                        contactForms: false,
                      };
                      XmlForms.listen('ContactsCtrl', options, (err, forms) => {
                        if (err) {
                          $log.error('Error fetching relevant forms', err);
                          return;
                        }
                        const showUnmuteModal = formId => {
                          return selected.doc &&
                                 selected.doc.muted &&
                                 !isUnmuteForm(settings, formId);
                        };
                        const formSummaries = forms && forms.map(xForm => {
                          return {
                            code: xForm.internalId,
                            title: translateTitle(xForm.translation_key, xForm.title),
                            icon: xForm.icon,
                            showUnmuteModal: showUnmuteModal(xForm.internalId)
                          };
                        });
                        globalActions.setRightActionBar({ relevantForms: formSummaries });
                      });

                      XmlForms.listen('ContactsCtrlContactForms', { contactForms: true }, (err, forms) => {
                        if (err) {
                          $log.error('Error fetching allowed contact forms', err);
                          return;
                        }

                        const allowCreateLink = contactType => forms.find(form => form._id === contactType.create_form);
                        const allowedChildTypes = childTypes.filter(allowCreateLink);

                        globalActions.setRightActionBar({ childTypes: getGroupedChildTypes(allowedChildTypes) });
                      });
                    });
                });
            });
        });
      };

      function updateSelectedContact(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.UPDATE_SELECTED_CONTACT, 'selected', selected));
      }

      function clearSelection() {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_CONTACT, 'selected', null));
        LiveList.contacts.clearSelected();
        LiveList['contact-search'].clearSelected();
      }

      return {
        loadSelectedContactChildren,
        loadSelectedContactReports,
        setLoadingSelectedContact,
        setContactsLoadingSummary,
        setSelectedContact,
        updateSelectedContact,

        clearSelection
      };
    };
  }
);
