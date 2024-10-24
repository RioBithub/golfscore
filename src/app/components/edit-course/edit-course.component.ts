import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import {
  APP_ROUTES,
  DELETE_COURSE,
  NAVIGATION_STATE_KEYS,
} from '../../models/constants';
import { Course } from '../../models/course';
import { RoundVariety } from '../../models/round';
import { PipesModule } from '../../pipes/pipes.module';
import { AppStateService } from '../../services/app-state.service';
import { CourseService } from '../../services/course.service';
import { RoundService } from '../../services/round.service';
import { AreYouSureDialogComponent } from '../are-you-sure-dialog/are-you-sure-dialog.component';

@Component({
  selector: 'app-edit-course',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatTableModule,
    MatIconModule,
    MatInputModule,
    MatDialogModule,
    CommonModule,
    PipesModule,
  ],
  templateUrl: './edit-course.component.html',
  styleUrl: './edit-course.component.scss',
})
export class EditCourseComponent {
  public editingCourse: Course;
  public courseIdToEdit: string;
  public readonly BACK_NINE = RoundVariety.BACK_NINE;
  public readonly FRONT_NINE = RoundVariety.FRONT_NINE;
  public readonly HOLE_COL = 'hole';
  public readonly PAR_COL = 'par';
  public readonly HOLE_SUMMARY_COL = 'holeSummary';
  public readonly PAR_SUMMARY_COL = 'parSummary';
  public readonly COURSE_TABLE_COLUMNS = [
    {
      columnDef: this.HOLE_COL,
      header: 'Hole',
    },
    {
      columnDef: this.PAR_COL,
      header: 'Par',
    },
  ];
  public readonly COURSE_TABLE_COLUMN_IDS = this.COURSE_TABLE_COLUMNS.map(
    (def) => def.columnDef,
  );
  public readonly COURSE_TABLE_SUMMARY_COLUMN_IDS = [
    this.HOLE_SUMMARY_COL,
    this.PAR_SUMMARY_COL,
  ];

  constructor(
    private appStateService: AppStateService,
    private courseService: CourseService,
    private dialog: MatDialog,
    private roundService: RoundService,
    private router: Router,
  ) {
    this.courseIdToEdit =
      router.getCurrentNavigation()?.extras?.state?.[
        NAVIGATION_STATE_KEYS.COURSE_ID_TO_EDIT
      ];
    console.log(this.courseIdToEdit);
    if (this.courseIdToEdit) {
      const retrieved = this.courseService.getCourse(this.courseIdToEdit);
      if (!retrieved) {
        this.router.navigateByUrl(APP_ROUTES.HOME);
        this.editingCourse = {} as Course;
        return;
      }
      this.editingCourse = JSON.parse(JSON.stringify(retrieved));
      this.appStateService.setPageTitle(`Editing ${retrieved?.name}`);
    } else {
      this.editingCourse = {
        id: `course-${crypto.randomUUID()}`,
        par: new Array(18).fill(4),
        name: '',
      };
      this.appStateService.setPageTitle(`Create Course`);
    }
  }

  public parPlusOne(index: number) {
    this.editingCourse.par[index]++;
  }

  public parMinusOne(index: number) {
    if (this.editingCourse.par[index]) {
      this.editingCourse.par[index]--;
    }
  }

  public showSummaryRow(index: number): boolean {
    return (index + 1) % 9 === 0;
  }

  public returnTrue(): boolean {
    return true;
  }

  public get disableSaveButton(): boolean {
    return (
      !this.editingCourse.name.length ||
      this.editingCourse.par.some((hole) => (hole || 0) <= 0)
    );
  }

  public deleteCourse(): void {
    this.dialog
      .open(AreYouSureDialogComponent, {
        data: DELETE_COURSE,
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          const updatedCurrentUser = this.appStateService.currentUser;
          if (updatedCurrentUser) {
            if (updatedCurrentUser?.roundIds?.length) {
              const roundIdsToRemove: Set<string> = new Set(
                this.roundService
                  .getRoundsByIds(updatedCurrentUser.roundIds)
                  .filter((round) => round.courseId === this.courseIdToEdit)
                  .map((round) => round.id),
              );
              updatedCurrentUser.roundIds = updatedCurrentUser.roundIds.filter(
                (roundId) => !roundIdsToRemove.has(roundId),
              );
              this.roundService.deleteRounds([...roundIdsToRemove]);
              updatedCurrentUser.courseStatsFilterSelect =
                updatedCurrentUser.courseStatsFilterSelect?.filter(
                  (courseId) => courseId !== this.courseIdToEdit,
                ) || [];
            }
            updatedCurrentUser.courseIds =
              updatedCurrentUser.courseIds?.filter(
                (courseId) => courseId !== this.courseIdToEdit,
              ) || [];
          }
          this.appStateService.currentUser = updatedCurrentUser;
          this.courseService.deleteCourses([this.courseIdToEdit]);
          this.router.navigateByUrl(APP_ROUTES.HOME);
        }
      });
  }

  public saveCourse(): void {
    if (!this.courseIdToEdit) {
      this.appStateService.currentUser?.courseIds.push(this.editingCourse.id);
    }
    this.appStateService.saveCurrentUser();
    this.courseService.setCourse(this.editingCourse);
    this.router.navigateByUrl(APP_ROUTES.COURSES);
  }
}
