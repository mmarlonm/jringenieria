import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';

@Component({
  selector: 'app-lead-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatStepperModule
  ],
  templateUrl: './lead-dialog.component.html'
})
export class LeadDialogComponent implements OnInit {
  action: 'create' | 'convert' | 'discard';
  leadForm: FormGroup;
  convertForm: FormGroup;
  discardForm: FormGroup;
  users: any[] = [];

  fuentes = ['WhatsApp', 'Web', 'Correo', 'Llamada', 'Feria', 'Recomendación'];
  sucursales = ['Pachuca', 'Puebla', 'Querétaro', 'Corporativo'];

  // Catálogos ISO 9001 (Sección 7.4)
  tiposCliente = [
    'Industrial', 'Comercial', 'Gobierno/Institucional', 
    'Distribuidor', 'Socio Comercial', 'OEM', 'Integrador'
  ];
  tiposNecesidad = [
    'Producto', 'Estudios y Análisis', 
    'Instalación y Puesta en Servicio', 'Proyectos'
  ];
  zonasAtencion = [
    'Pachuca', 'Puebla', 'Querétaro', 
    'Otra zona atendible', 'Canalización externa / No atendible'
  ];
  prioridades = ['Alta', 'Media', 'Baja'];
  potenciales = ['Estratégico', 'Recurrente', 'Ocasional', 'No Viable'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<LeadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.action = data.action;
    this.users = data.users || [];
  }

  ngOnInit(): void {
    // Formulario para Crear Lead
    this.leadForm = this.fb.group({
      nombreContacto: ['', Validators.required],
      empresa: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9\\-\\+ ]{10,15}$')]],
      email: ['', [Validators.required, Validators.email]],
      fuenteLead: ['WhatsApp', Validators.required],
      necesidadInicial: ['', Validators.required],
      sucursalQueRecibe: ['Pachuca', Validators.required],
      idUsuarioAsignado: [null, Validators.required]
    });

    // Formulario para Calificar y Convertir a Oportunidad (ISO 9001)
    this.convertForm = this.fb.group({
      tipoCliente: ['', Validators.required],
      tipoNecesidad: ['', Validators.required],
      zonaAtencion: ['', Validators.required],
      nivelPrioridad: ['', Validators.required],
      potencialPreliminar: ['', Validators.required]
    });

    // Formulario para Descartar
    this.discardForm = this.fb.group({
      motivoDescarte: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.action === 'create' && this.leadForm.valid) {
      this.dialogRef.close({ action: 'create', data: this.leadForm.value });
    } else if (this.action === 'convert' && this.convertForm.valid) {
      this.dialogRef.close({ action: 'convert', data: this.convertForm.value });
    } else if (this.action === 'discard' && this.discardForm.valid) {
      this.dialogRef.close({ action: 'discard', data: this.discardForm.value });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
