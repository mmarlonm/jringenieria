import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { RequerimientosService, Requerimiento } from '../requerimientos.service';

@Component({
  selector: 'app-requerimiento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './requerimiento-dialog.component.html'
})
export class RequerimientoDialogComponent implements OnInit {
  reqForm: FormGroup;
  isEditMode: boolean = false;
  usuarios: any[] = [];
  sucursales = ['Pachuca', 'Puebla', 'Querétaro', 'Corporativo'];

  constructor(
    private fb: FormBuilder,
    private reqService: RequerimientosService,
    private dialogRef: MatDialogRef<RequerimientoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { requerimiento?: Requerimiento; users: any[] }
  ) {
    this.isEditMode = !!data.requerimiento;
    this.usuarios = data.users || [];

    this.reqForm = this.fb.group({
      nombreContacto: [data.requerimiento?.nombreContacto || '', [Validators.required]],
      empresa: [data.requerimiento?.empresa || '', [Validators.required]],
      telefono: [data.requerimiento?.telefono || ''],
      email: [data.requerimiento?.email || '', [Validators.email]],
      sucursal: [data.requerimiento?.sucursal || 'Pachuca', [Validators.required]],
      descripcion: [data.requerimiento?.descripcion || '', [Validators.required]],
      usuarioAsignadoId: [data.requerimiento?.usuarioAsignadoId || null]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.reqForm.invalid) return;

    const val = this.reqForm.value;
    if (this.isEditMode && this.data.requerimiento) {
      this.reqService.updateRequerimiento(this.data.requerimiento.id, val).subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => console.error(err)
      });
    } else {
      this.reqService.createRequerimiento(val).subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => console.error(err)
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
