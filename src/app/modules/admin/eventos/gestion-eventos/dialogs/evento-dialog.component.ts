import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { EventosService } from '../../eventos.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-evento-dialog',
    templateUrl: './evento-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatCheckboxModule
    ]
})
export class EventoDialogComponent implements OnInit {
    private _fb = inject(FormBuilder);
    private _dialogRef = inject(MatDialogRef<EventoDialogComponent>);
    private _eventosService = inject(EventosService);

    public form!: FormGroup;
    public isEdit: boolean = false;
    public isSaving: boolean = false;
    public errorMsg: string = '';

    constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

    ngOnInit(): void {
        this.isEdit = !!this.data?.evento;
        
        this.form = this._fb.group({
            id: [this.data?.evento?.id || 0],
            nombreNovedad: [this.data?.evento?.nombreNovedad || '', [Validators.required, Validators.maxLength(150)]],
            anio: [this.data?.evento?.anio || new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(2100)]],
            sede: [this.data?.evento?.sede || '', [Validators.required, Validators.maxLength(100)]],
            activo: [this.data?.evento?.activo !== false] // default to true
        });
    }

    save(): void {
        if (this.form.invalid) return;

        this.isSaving = true;
        this.errorMsg = '';
        const payload = this.form.value;

        this._eventosService.saveEvento(payload).subscribe({
            next: (res) => {
                this.isSaving = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.isSaving = false;
                console.error(err);
                this.errorMsg = err.error?.mensaje || err.error || 'Ocurrió un error al guardar el evento.';
            }
        });
    }

    close(): void {
        this._dialogRef.close(null);
    }
}
