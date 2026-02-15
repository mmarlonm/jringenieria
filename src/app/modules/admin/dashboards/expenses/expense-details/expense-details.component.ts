import { ChangeDetectionStrategy, Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Expense } from '../models/expenses.types';

@Component({
    selector: 'expense-details',
    templateUrl: './expense-details.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatDividerModule,
        CurrencyPipe,
        DatePipe
    ]
})
export class ExpenseDetailsComponent {
    expense: Expense;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { expense: Expense },
        public _dialogRef: MatDialogRef<ExpenseDetailsComponent>
    ) {
        this.expense = data.expense;
    }
}