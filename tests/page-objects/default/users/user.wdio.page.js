const _ = require('lodash');
const commonElements = require('@page-objects/default/common/common.wdio.page');

const addUserButton = () => $('a#add-user');
const cancelButton = () => $('a[test-id="modal-cancel-btn"]');
const addUserDialog = () => $('div#edit-user-profile');
const userName = () => $('#edit-username');
const userFullName = () => $('#fullname');
const userPassword = () => $('#edit-password');
const userConfirmPassword = () => $('#edit-password-confirm');
const passwordToggleButton = () => $('#password-toggle');
const saveUserButton = () => $('a[test-id="modal-submit-btn"]');
const logoutButton = () => $('i.fa-power-off');
const usernameTextSelector = '[test-id="username-list"]';
const usernameText = () => $(usernameTextSelector);
const usernameTextList = () => $$(usernameTextSelector);
const userList = () => $$('[test-id="user-list"]');
const usernameErrorMessage = () => $('span.help-block.ng-binding');
const passwordErrorMessage = () => $('.password-input-group ~ .help-block');
const placeErrorMessage = () => $('#facilitySelect ~ .help-block');
const contactErrorMessage = () => $('#contactSelect ~ .help-block');
const uploadUsersButton = () => $('a#add-users');
const uploadUsersDialog = () => $('div#bulk-user-upload');
const confirmUploadUsersButton = () => $('a#upload-btn');
const uploadSummaryDialog = () => $('#finish-summary');
const successfullyUploadedUsers = () => $('p.text-success');
const previouslyUploadedUsers = () => $('p.text-muted');
const failedUploadedUsers = () => $('p.text-danger');
const backToUserListButton = () => $('a#back-to-app-btn');
const ssoLogin = () => $('#sso-login');

const goToAdminUser = async () => {
  await commonElements.goToUrl('/admin/#/users');
};

const goToAdminUpgrade = async () => {
  await commonElements.goToUrl('/admin/#/upgrade');
};

const openAddUserDialog = async () => {
  await addUserButton().waitForDisplayed();
  await addUserButton().click();
  await addUserDialog().waitForDisplayed();
  // wait for animations to finish
  await browser.pause(500);
};

const getUsernameRow = async (username) => {
  await usernameText().waitForDisplayed();
  const elems = await userList();
  const found = await elems.filter(async elem => await elem.$$(usernameTextSelector)[0].getText() === username);
  return found.length === 0? undefined : found[0];
};

const openEditUserDialog = async (username) => {
  const element = await getUsernameRow(username);

  if (!element) {
    return;
  }

  element.waitForDisplayed();
  element.click();
  await addUserDialog().waitForDisplayed();
  await browser.pause(500);
};

const editUserDialogDetails = async () => {
  return {
    usernameText: await (await $('[id="edit-username"]')).getValue(),
    chwIsSelected: await (await $('input[value="chw"]')).isSelected(),
    place: await (await $('[id="facilitySelect"]')).getValue(),
    contact: await (await $('[id="contactSelect"]')).getValue(),
    ssoEmail: await (await $('[id="sso-login"]')).getValue()
  };
};

const scrollToBottomOfModal = async () => {
  await browser.execute(() => {
    const modalWindow = document.querySelector('.modal');
    modalWindow.scrollTop = modalWindow.scrollHeight;
  });
};

const inputAddUserFields = async ({
  username, fullname, role, places, contact, password, confirmPassword = password, oidcUsername
}) => {
  await userName().setValue(username);
  await userFullName().setValue(fullname);
  await $(`#role-select input[value="${role}"]`).click();

  // we need to scroll to the bottom to bring the select2 elements into view
  // scrollIntoView doesn't work because they're within a scrollable div (the modal)
  await scrollToBottomOfModal();

  if (!_.isEmpty(places)) {
    if (Array.isArray(places)) {
      for (const name of places) {
        await selectPlace([name]);
      }
    } else {
      await selectPlace([places]);
    }
  }

  if (!_.isEmpty(contact)) {
    await selectContact(contact);
  }

  if (password !== undefined) {
    await userPassword().setValue(password);
    await userConfirmPassword().setValue(confirmPassword);
  }
  if (oidcUsername !== undefined) {
    await ssoLogin().setValue(oidcUsername);
  }
};

const inputUploadUsersFields = async (filePath) => {
  await $('input[type="file"]').addValue(filePath);
};

const setSelect2 = async (id, value) => {
  const input = $(`span.select2-selection[aria-labelledby=select2-${id}-container]`);
  await input.waitForExist();
  await input.click();

  const searchField = $(
    `.select2-container--open .select2-search__field`
  );
  await searchField.waitForExist();
  await searchField.setValue(value);

  const option = $('.name');
  await option.waitForExist();
  await option.click();
};

const setPlaceSelectMultiple = async (value) => {
  const input = $(`span.select2-selection--multiple`);
  await input.waitForExist();
  await input.click();

  const searchField = $('span.select2-selection--multiple .select2-search__field');
  await searchField.waitForExist();
  await searchField.setValue(value);

  const option = $('.name');
  await option.waitForExist();
  await option.click();
  await browser.waitUntil(async () => await $('.select2-selection__choice').isDisplayed(),  1000);
};

const selectPlace = async (places) => {
  for (const place of places) {
    await setPlaceSelectMultiple(place);
  }
};

const selectContact = async (associatedContact) => {
  await setSelect2('contactSelect', associatedContact);
};

const saveUser = async (isSuccessExpected = true)  => {
  await saveUserButton().click();
  if (isSuccessExpected) {
    await addUserDialog().waitForDisplayed({ reverse: true });
  }
};

const uploadUsers = async () => {
  await confirmUploadUsersButton().waitForDisplayed();
  await confirmUploadUsersButton().click();
};

const logout = async () => {
  await logoutButton().waitForDisplayed();
  await logoutButton().click();
};

const getAllUsernames = async () => {
  await usernameText().waitForDisplayed();
  return commonElements.getTextForElements(usernameTextList);
};

const getUsernameErrorText = async () => {
  return await usernameErrorMessage().getText();
};

const getPasswordErrorText = async () => {
  await passwordErrorMessage().waitForDisplayed();
  return await passwordErrorMessage().getText();
};

const setUserPassword = async (password) => {
  await userPassword().waitForDisplayed();
  await userPassword().setValue(password);
};

const setUserConfirmPassword = async (password) => {
  await userConfirmPassword().waitForDisplayed();
  await userConfirmPassword().setValue(password);
};

const togglePassword = async () => {
  await userPassword().waitForDisplayed();
  await userConfirmPassword().waitForDisplayed();
  await passwordToggleButton().click();

  return {
    type: await userPassword().getAttribute('type'),
    value: await userPassword().getValue(),
    confirmType: await userConfirmPassword().getAttribute('type'),
    confirmValue: await userConfirmPassword().getValue(),
  };
};

const getPlaceErrorText = async () => {
  return await placeErrorMessage().getText();
};

const getContactErrorText = async () => {
  return await contactErrorMessage().getText();
};

const getSuccessfullyUploadedUsers = async () => {
  return await successfullyUploadedUsers().getText();
};

const getPreviouslyUploadedUsers = async () => {
  return await previouslyUploadedUsers().getText();
};

const getFailedUploadedUsers = async () => {
  return await failedUploadedUsers().getText();
};

const backToUserList = async () => {
  await backToUserListButton().waitForDisplayed();
  await backToUserListButton().click();
};

const openUploadUsersDialog = async () => {
  await uploadUsersButton().waitForDisplayed();
  await uploadUsersButton().click();
  await uploadUsersDialog().waitForDisplayed();
  // wait for animations to finish
  await browser.pause(500);
};

const waitForUploadSummary = async () => {
  await uploadSummaryDialog().waitForDisplayed();
};

const closeAddUserDialog = async () => {
  await cancelButton().click();
  await addUserDialog().waitForDisplayed({ reverse: true });
};
const scrollToRole = async () => {
  await $('#role-select').scrollIntoView();
};

module.exports = {
  addUserDialog,
  goToAdminUser,
  goToAdminUpgrade,
  openAddUserDialog,
  openEditUserDialog,
  editUserDialogDetails,
  inputAddUserFields,
  saveUser,
  logout,
  getAllUsernames,
  getUsernameErrorText,
  getPasswordErrorText,
  togglePassword,
  setUserPassword,
  setUserConfirmPassword,
  getPlaceErrorText,
  getContactErrorText,
  openUploadUsersDialog,
  inputUploadUsersFields,
  uploadUsers,
  waitForUploadSummary,
  getSuccessfullyUploadedUsers,
  getPreviouslyUploadedUsers,
  getFailedUploadedUsers,
  backToUserList,
  closeAddUserDialog,
  scrollToRole,
  addUserButton
};
