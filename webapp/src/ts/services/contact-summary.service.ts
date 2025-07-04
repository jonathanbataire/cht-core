import { Injectable, NgZone } from '@angular/core';

import { SettingsService } from '@mm-services/settings.service';
import { PipesService } from '@mm-services/pipes.service';
import { UHCSettingsService } from '@mm-services/uhc-settings.service';
import { UHCStatsService } from '@mm-services/uhc-stats.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

/**
 * Service for generating summary information based on a given
 * contact and reports about them.
 * Documentation: https://github.com/medic/medic-docs/blob/master/configuration/contact-summary.md
 */
@Injectable({
  providedIn: 'root'
})
export class ContactSummaryService {
  private readonly SETTING_NAME = 'contact_summary';
  private generatorFunction;
  private settings;
  private visitCountSettings;

  constructor(
    private settingsService:SettingsService,
    private pipesService:PipesService,
    private ngZone:NgZone,
    private uhcSettingsService:UHCSettingsService,
    private uhcStatsService:UHCStatsService,
    private chtDatasourceService:CHTDatasourceService
  ) { }

  private getGeneratorFunction() {
    if (!this.generatorFunction) {
      const script = this.settings[this.SETTING_NAME];

      if (!script) {
        this.generatorFunction = function() {};
      } else {
        this.generatorFunction = new Function(
          'contact',
          'reports',
          'lineage',
          'uhcStats',
          'cht',
          'targetDoc',
          script
        );
      }
    }

    return this.generatorFunction;
  }

  private applyFilter(field) {
    if (field && field.filter) {
      try {
        field.value = this.pipesService.transform(field.filter, field.value);
      } catch (e) {
        console.error(e);
        throw new Error('Unknown filter: ' + field.filter + '. Check your configuration.');
      }
    }
  }

  private applyFilters(summary) {
    console.debug('contact summary eval result', JSON.stringify(summary));

    summary = summary || {};
    summary.fields = (summary.fields && Array.isArray(summary.fields)) ? summary.fields : [];
    summary.cards = (summary.cards && Array.isArray(summary.cards)) ? summary.cards : [];

    summary.fields.forEach(field => this.applyFilter(field));
    summary.cards.forEach((card) => {
      if (card && card.fields && Array.isArray(card.fields)) {
        card.fields.forEach(field => this.applyFilter(field));
      }
    });
    return summary;
  }

  get(contact, reports, lineage, targetDocs) {
    return this.ngZone.runOutsideAngular(() => this._get(contact, reports, lineage, targetDocs));
  }

  private async _get(contact, reports, lineage, targetDocs) {
    if (!this.settings) {
      this.settings = await this.settingsService.get();
    }

    if (!this.visitCountSettings) {
      this.visitCountSettings = this.uhcSettingsService.getVisitCountSettings(this.settings);
    }

    const generatorFunction = this.getGeneratorFunction();
    const uhcStats = {
      homeVisits: await this.uhcStatsService.getHomeVisitStats(contact, this.visitCountSettings),
      uhcInterval: this.uhcStatsService.getUHCInterval(this.visitCountSettings)
    };

    const chtScriptApi = await this.chtDatasourceService.get();
    chtScriptApi.v1.analytics.getTargetDocs = () => targetDocs;

    try {
      const summary = generatorFunction(contact, reports || [], lineage || [], uhcStats, chtScriptApi, targetDocs[0]);
      return this.applyFilters(summary);
    } catch (error) {
      console.error('Configuration error in contact-summary function: ', error);
      throw new Error('Configuration error');
    }
  }
}
