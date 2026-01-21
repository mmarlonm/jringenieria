import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

// Service
import { SurveysService } from '../surveys.service';

@Component({
  selector: 'app-survey-dialog',
  templateUrl: './survey-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule
  ]
})
export class SurveysComponent implements OnInit {

  form!: FormGroup;

  fields = [
    { label: '¿Cómo calificarías el servicio del personal que te atendió?', control: 'servicioPersonal' },
    { label: '¿Qué posibilidades hay de que recomiendes nuestros servicios?', control: 'recomendarServicios' },
    { label: '¿En qué medida los servicios ayudaron a resolver tu problema?', control: 'ayudaProblema' },
    { label: '¿Cómo calificas el desarrollo de los servicios?', control: 'desarrolloServicios' },
    { label: '¿Cómo evalúas la calidad y el tiempo de entrega?', control: 'calidadTiempo' }
  ];

  scale = [
    { value: 0, emoji: '😠' },
    { value: 1, emoji: '😠' },
    { value: 2, emoji: '😞' },
    { value: 3, emoji: '😞' },
    { value: 4, emoji: '😐' },
    { value: 5, emoji: '😐' },
    { value: 6, emoji: '🙂' },
    { value: 7, emoji: '🙂' },
    { value: 8, emoji: '😊' },
    { value: 9, emoji: '😊' },
    { value: 10, emoji: '🤩' }
  ];

  constructor(
    private fb: FormBuilder,
    private surveyService: SurveysService,
    public dialogRef: MatDialogRef<SurveysComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: [''],
      empresa: [''],
      email: [''],
      telefono: [''],
      puesto: [''],
      sucursal: [''],
      serviciosRecibidos: [''],

      servicioPersonal: [0],
      recomendarServicios: [0],
      ayudaProblema: [0],
      desarrolloServicios: [0],
      calidadTiempo: [0],

      mejoras: [''],
      productosDeseados: [''],
      comoConocio: ['']
    });

    this.surveyService.getSurveyById(this.data.id).subscribe(res => {
      this.form.patchValue(res.data);
      this.form.disable(); // 🔒 solo lectura
    });
  }
}
