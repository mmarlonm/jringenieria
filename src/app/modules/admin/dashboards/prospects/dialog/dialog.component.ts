import { TextFieldModule } from '@angular/cdk/text-field';
import { AsyncPipe, NgClass } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Inject,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRippleModule } from '@angular/material/core';
import {
    MAT_DIALOG_DATA,
    MatDialogModule,
    MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
    Observable,
    Subject,
    debounceTime,
    map,
    of,
    switchMap,
    takeUntil,
} from 'rxjs';

import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";

@Component({
    selector: 'notes-dialog',
    templateUrl: './dialog.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        MatButtonModule,
        MatIconModule,
        FormsModule,
        TextFieldModule,
        MatCheckboxModule,
        NgClass,
        MatRippleModule,
        MatMenuModule,
        MatDialogModule,
        AsyncPipe,
        MatFormFieldModule,
        MatInputModule
    ],
})
export class NotesDetailsComponent implements OnInit, OnDestroy {
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    note$: Observable<any>;

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) public _data: { note: any },
        private _matDialogRef: MatDialogRef<NotesDetailsComponent>
    ) {}

    ngOnInit(): void {
        this.note$ = of(this._data.note).pipe(takeUntil(this._unsubscribeAll));
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    /**
     * Guarda la nota y cierra el diálogo
     */
    saveNote(): void {
        this._matDialogRef.close(this._data.note);
    }

    /**
     * Cierra el diálogo sin guardar
     */
    closeDialog(): void {
        this._matDialogRef.close();
    }
}
