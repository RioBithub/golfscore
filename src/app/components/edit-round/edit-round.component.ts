import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { TypedTemplateDirective } from '../../directives/typed-template.directive';
import {
  APP_ROUTES,
  DELETE_ROUND,
  NAVIGATION_STATE_KEYS,
} from '../../models/constants';
import { Course } from '../../models/course';
import { Round, RoundVariety } from '../../models/round';
import { PipesModule } from '../../pipes/pipes.module';
import { AppStateService } from '../../services/app-state.service';
import { CourseService } from '../../services/course.service';
import { RoundService } from '../../services/round.service';
import { AutosizeModule } from 'ngx-autosize';

import {
  MatDatepickerInputEvent,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AreYouSureDialogComponent } from '../are-you-sure-dialog/are-you-sure-dialog.component';

interface ColumnDef {
  columnDef: string;
  header: string;
}

@Component({
  selector: 'app-edit-round',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatTableModule,
    MatIconModule,
    MatInputModule,
    PipesModule,
    MatSelectModule,
    MatDatepickerModule,
    DatePipe,
    CommonModule,
    TypedTemplateDirective,
    MatDialogModule,
    AutosizeModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './edit-round.component.html',
  styleUrl: './edit-round.component.scss',
})
export class EditRoundComponent {
  public editingRound: Round;
  public coursesToChooseFrom: Course[];
  public currentCourse: Course | null = null;
  public roundIdToEdit: string;
  public readonly BACK_NINE = RoundVariety.BACK_NINE;
  public readonly FRONT_NINE = RoundVariety.FRONT_NINE;
  public readonly HOLE_COL = 'hole';
  public readonly STROKES_COL = 'par';
  public readonly PUTTS_COL = 'putts';
  public readonly HOLE_SUMMARY_COL = 'holeSummary';
  public readonly STROKES_SUMMARY_COL = 'parSummary';
  public readonly PUTTS_SUMMARY_COL = 'puttsSummary';
  public readonly ROUND_TABLE_COLUMNS: ColumnDef[] = [
    {
      columnDef: this.HOLE_COL,
      header: 'Hole',
    },
    {
      columnDef: this.STROKES_COL,
      header: 'Strokes',
    },
    {
      columnDef: this.PUTTS_COL,
      header: 'Putts',
    },
  ];
  public readonly ROUND_TABLE_COLUMN_IDS = [
    this.HOLE_COL,
    this.STROKES_COL,
    this.PUTTS_COL,
  ];
  public readonly ROUND_TABLE_SUMMARY_COLUMN_IDS = [
    this.HOLE_SUMMARY_COL,
    this.STROKES_SUMMARY_COL,
    this.PUTTS_SUMMARY_COL,
  ];
  public SCORE_GRAPHIC_TYPES!: {
    score: number;
    scoreToPar: number;
  };
  public HOLE_ROW_TYPES!: {
    holeIndex: number;
    column: ColumnDef;
  };
  public SUMMARY_ROW_TYPES!: {
    outOrIn: RoundVariety;
    columnId: string;
  };
  public readonly ROUND_VARIETIES = Object.values(RoundVariety);
  public readonly ROUND_VARIETY_ENUM = RoundVariety;

  constructor(
    private appStateService: AppStateService,
    private courseService: CourseService,
    private roundService: RoundService,
    private router: Router,
    private dialog: MatDialog,
    datePipe: DatePipe,
  ) {
    this.coursesToChooseFrom = this.courseService.getAllCoursesForCurrentUser();
    this.roundIdToEdit =
      router.getCurrentNavigation()?.extras?.state?.[
        NAVIGATION_STATE_KEYS.ROUND_ID_TO_EDIT
      ];
    console.log(this.roundIdToEdit);
    if (this.roundIdToEdit) {
      const retrieved = this.roundService.getRoundsByIds([
        this.roundIdToEdit,
      ])?.[0];
      if (!retrieved) {
        this.router.navigateByUrl(APP_ROUTES.HOME);
        this.editingRound = {} as Round;
        return;
      }
      this.editingRound = JSON.parse(JSON.stringify(retrieved));
      this.appStateService.setPageTitle(
        `Editing ${datePipe.transform(retrieved?.dateStringISO)}`,
      );
      this.updateCurrentCourse(this.editingRound.courseId);
    } else {
      this.editingRound = {
        id: `round-${crypto.randomUUID()}`,
        strokes: new Array(18).fill(0),
        putts: new Array(18).fill(undefined),
        courseId: '',
        dateStringISO: new Date().toISOString(), // TODO: make editable
        roundVariety: RoundVariety.EIGHTEEN,
      };
      this.appStateService.setPageTitle(`Create Round`);
    }
  }

  public updateCurrentCourse(newCourseId: string): void {
    console.log('selected course', newCourseId);
    this.currentCourse = this.courseService.getCourse(newCourseId);
  }

  public updateRoundVariety(newRoundVariety: RoundVariety): void {
    console.log('selected round variety', newRoundVariety);
    this.editingRound.roundVariety = newRoundVariety;
  }

  public strokesPlusOne(index: number) {
    this.editingRound.strokes[index]++;
  }

  public strokesMinusOne(index: number) {
    if (this.editingRound.strokes[index]) {
      this.editingRound.strokes[index]--;
    }
  }

  public puttsPlusOne(index: number) {
    if (!this.editingRound.putts[index]) {
      this.editingRound.putts[index] = 0;
    }
    this.editingRound.putts[index]++;
  }

  public puttsMinusOne(index: number) {
    if (!this.editingRound.putts[index]) {
      this.editingRound.putts[index] = 0;
    } else {
      this.editingRound.putts[index]--;
    }
  }

  public showSummaryRow(index: number): boolean {
    return (index + 1) % 9 === 0;
  }

  public returnTrue(): boolean {
    return true;
  }

  public dateChanged(event: MatDatepickerInputEvent<Date>): void {
    if (event.value) {
      this.editingRound.dateStringISO = event.value.toISOString();
    }
  }

  public get disableSaveButton(): boolean {
    return (
      !this.editingRound.dateStringISO ||
      !this.editingRound.roundVariety ||
      !this.editingRound.courseId.length
    );
  }

  public deleteRound(): void {
    this.dialog
      .open(AreYouSureDialogComponent, {
        data: DELETE_ROUND,
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          const updatedCurrentUser = this.appStateService.currentUser;
          if (updatedCurrentUser) {
            updatedCurrentUser.roundIds = updatedCurrentUser.roundIds.filter(
              (roundId) => roundId !== this.roundIdToEdit,
            );
          }
          this.appStateService.currentUser = updatedCurrentUser;
          this.roundService.deleteRounds([this.roundIdToEdit]);
          this.router.navigateByUrl(APP_ROUTES.HOME);
        }
      });
  }

  public saveRound(): void {
    if (!this.roundIdToEdit) {
      this.appStateService.currentUser?.roundIds.push(this.editingRound.id);
      if (
        this.appStateService.currentUser?.courseIds?.length &&
        this.appStateService.currentUser?.courseStatsFilterSelect?.length ===
          this.appStateService.currentUser?.courseIds?.length - 1 &&
        !this.appStateService.currentUser?.courseStatsFilterSelect?.includes(
          this.editingRound.courseId,
        )
      ) {
        // if the user had all courses selected before creating this course, keep all courses selected
        this.appStateService.currentUser.courseStatsFilterSelect.push(
          this.editingRound.courseId,
        );
      }
    }
    this.appStateService.saveCurrentUser();
    this.roundService.saveRounds([this.editingRound]);
    this.router.navigateByUrl(APP_ROUTES.HOME);
  }
}
