import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import  { PipesModule } from '@mm-pipes/pipes.module';

import { AboutComponent } from './about/about.component';
import { ErrorComponent } from './error/error.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { ReportsComponent } from './reports/reports.component';
import { ReportsContentComponent } from './reports/reports-content.component';
import { ComponentsModule } from '../components/components.module';
import { MessagesComponent } from './messages/messages.component';
import { MessagesContentComponent } from './messages/messages-content.component';

@NgModule({
  declarations: [
    AboutComponent,
    ErrorComponent,
    AnalyticsComponent,
    ReportsComponent,
    ReportsContentComponent,
    MessagesComponent,
    MessagesContentComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    PipesModule,
    RouterModule,
    ComponentsModule,
    FormsModule,
  ],
  exports: [
    AboutComponent,
    ErrorComponent,
    AnalyticsComponent,
    ReportsComponent,
    ReportsContentComponent,
    MessagesComponent,
  ]
})
export class ModulesModule { }
