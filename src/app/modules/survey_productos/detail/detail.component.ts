import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { EncuestaProductosDTO, SurveyProductosService } from 'app/modules/survey_productos/survey-productos.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-survey-productos-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,

    // Material
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatButtonModule
  ]
})
export class DetailComponent implements OnInit {
  form!: FormGroup;
  cotizacionProductoId: number = 0;

  /** Variable usada por TODAS las caritas (según HTML actual) */
  calificacion: number | null = null;

  fields = [
    {
      label: '¿Cómo calificarías el servicio del personal que te atendió?',
      control: 'servicioPersonal'
    },
    {
      label: '¿Qué posibilidades hay de que recomiendes nuestros productos?',
      control: 'recomendarProductos',
      razon: 'razonRecomendar'
    },
    {
      label: '¿En qué medida los productos ayudaron a resolver tu problema?',
      control: 'ayudaProducto'
    },
    {
      label: '¿Nuestro equipo comprendió tus necesidades?',
      control: 'comprensionNecesidades'
    },
    {
      label: '¿Cómo evalúas calidad y tiempo de entrega?',
      control: 'tiempoEntrega'
    }
  ];


  /** Escala visual */
  scale = [
    { value: 0, emoji: '☹️' },
    { value: 1, emoji: '☹️' },
    { value: 2, emoji: '☹️' },
    { value: 3, emoji: '☹️' },
    { value: 4, emoji: '☹️' },
    { value: 5, emoji: '☹️' },
    { value: 6, emoji: '☹️' },
    { value: 7, emoji: '😐' },
    { value: 8, emoji: '😐' },
    { value: 9, emoji: '😊' },
    { value: 10, emoji: '😊' }
  ];

  encuestaYaRespondida = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient,
    private surveyService: SurveyProductosService
  ) { }

  ngOnInit(): void {
    this.cotizacionProductoId = +this.route.snapshot.paramMap.get('id')!;

    this.form = this.fb.group({
      sucursal: [''],
      nombre: [''],
      empresa: [''],
      email: [''],
      telefono: [''],
      cargo: [''],

      // Ratings
      servicioPersonal: [null],
      recomendarProductos: [null],
      ayudaProducto: [null],
      comprensionNecesidades: [null],
      tiempoEntrega: [null],

      // Razones
      razonServicio: [''],

      productosDeseados: [''],
      comoConocio: ['']
    });

    this.surveyService.existeEncuestaProducto(this.cotizacionProductoId).subscribe((existe) => {
      this.encuestaYaRespondida = existe;

      if (existe) {
        this.form.disable(); // Desactiva el formulario si ya fue respondido
      }
    });
  }

  /**
   * Selección de carita
   * NOTA: según el HTML actual, esta calificación
   * se replica en las 4 preguntas
   */
  select(value: number): void {
    this.calificacion = value;

    // Guardamos el mismo valor en las 4 preguntas
    this.form.patchValue({
      servicioPersonal: value,
      recomendarProductos: value,
      ayudaProducto: value,
      tiempoEntrega: value
    });

  }

  /**
   * Envío de encuesta
   */
  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      cotizacionProductoId: this.cotizacionProductoId, // 🔴 IMPORTANTE
      sucursal: this.form.value.sucursal,

      nombre: this.form.value.nombre,
      empresa: this.form.value.empresa,
      email: this.form.value.email,
      telefono: this.form.value.telefono,
      cargo: this.form.value.cargo,

      servicioPersonal: this.form.value.servicioPersonal,
      recomendarProductos: this.form.value.recomendarProductos,
      ayudaProducto: this.form.value.ayudaProducto,
      comprensionNecesidades: this.form.value.comprensionNecesidades,
      tiempoEntrega: this.form.value.tiempoEntrega,

      razonServicio: this.form.value.razonServicio,

      productosDeseados: this.form.value.productosDeseados,
      comoConocio: this.form.value.comoConocio
    };

    this.surveyService.guardarEncuestaProducto(payload).subscribe({
      next: (res) => {
        if (res.code === 200) {
          Swal.fire({
            icon: 'success',
            title: '¡Gracias!',
            text: 'Encuesta guardada exitosamente.',
            confirmButtonText: 'Aceptar'
          });

          window.location.reload();

          this.form.reset();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: res.message || 'Ocurrió un error al guardar la encuesta.'
          });
        }
      },
      error: (error) => {
        console.error('Error al guardar la encuesta:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Ocurrió un error al enviar la encuesta. Por favor, inténtalo de nuevo más tarde.'
        });
      }
    });
  }

}
