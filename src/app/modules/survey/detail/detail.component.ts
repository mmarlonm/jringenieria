import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import Swal from 'sweetalert2';

// Services
import { EncuestaDTO, SurveyService } from 'app/modules/survey/survey.service';

@Component({
  selector: 'app-survey-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatSliderModule,
    MatSelectModule,
    MatRadioModule,
    MatButtonModule
  ]
})
export class DetailComponent implements OnInit {

  form!: FormGroup;
  proyectoId = 0;

  /** 👉 CONTROL DE PASOS */
  step = 1;

  encuestaYaRespondida = false;

  fields = [
    { label: '¿Cómo calificarías el servicio del personal que te atendió?', control: 'servicioPersonal', razon: 'razonServicio' },
    { label: '¿Qué posibilidades hay de que recomiendes nuestros productos?', control: 'recomendarProductos', razon: 'razonRecomendar' },
    { label: '¿En qué medida los productos ayudaron a resolver tu problema?', control: 'ayudaProducto', razon: 'razonAyuda' },
    { label: '¿Nuestro equipo comprendió tus necesidades?', control: 'comprensionNecesidades', razon: 'razonComprension' },
    { label: '¿Cómo evalúas calidad y tiempo de entrega?', control: 'tiempoEntrega', razon: 'razonEntrega' }
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

  unidadesDeNegocio: any[] = [];
  escalaNumerica: number[] = Array.from({ length: 11 }, (_, i) => i);


  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private surveyService: SurveyService
  ) { }

  ngOnInit(): void {
    this.proyectoId = Number(this.route.snapshot.paramMap.get('id'));

    /** ✅ FORMULARIO COMPLETO */
    this.form = this.fb.group({
      // Paso 1
      nombre: [''],
      empresa: [''],
      email: [''],
      telefono: [''],
      puesto: [''],
      sucursal: [''],

      // Paso 2
      serviciosRecibidos: [''],

      // Paso 3
      servicioPersonal: [null],
      recomendarServicios: [null],
      ayudaProblema: [null],
      desarrolloServicios: [null],
      calidadTiempo: [null],
      mejoras: [''],

      // Paso 4
      productosDeseados: [''],
      comoConocio: ['']
    });


    /** ✅ VALIDAR SI YA EXISTE */
    this.surveyService.existeEncuesta(this.proyectoId).subscribe(existe => {
      this.encuestaYaRespondida = existe;
      if (existe) {
        this.form.disable();
      }
    });

    this.getUnidadesDeNegocio();
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const data: EncuestaDTO = {
      proyectoId: this.proyectoId,
      ...this.form.value
    };

    this.surveyService.guardarEncuesta(data).subscribe({
      next: res => {
        if (res.code === 200) {
          Swal.fire('¡Gracias!', 'Encuesta guardada exitosamente.', 'success');
          this.form.reset();
          this.step = 1;
        } else {
          Swal.fire('Error', res.message || 'Error al guardar encuesta', 'error');
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudo enviar la encuesta.', 'error');
      }
    });
  }

  getUnidadesDeNegocio(): void {
    this.surveyService
      .getUnidadesDeNegocio()
      .subscribe((data) => (this.unidadesDeNegocio = data));
  }
}
