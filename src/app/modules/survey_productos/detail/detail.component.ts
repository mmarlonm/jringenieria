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
  proyectoId = 0;

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

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.proyectoId = Number(
      this.route.snapshot.paramMap.get('proyectoId')
    );

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
      razonRecomendar: [''],
      razonAyuda: [''],
      razonComprension: [''],
      razonEntrega: [''],

      productosDeseados: [''],
      comoConocio: ['']
    });


    // Debug inicial
    console.log('Formulario inicializado:', this.form.value);
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

    console.log('Calificación seleccionada:', value);
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
      proyectoId: this.proyectoId,
      ...this.form.value
    };

    console.log('Payload enviado:', payload);
    return;
    this.http.post('/api/encuesta/guardar', payload).subscribe({
      next: () => {
        alert('Gracias por tu respuesta 🙌');
        this.form.reset();
        this.calificacion = null;
      },
      error: (err) => {
        console.error('Error al enviar encuesta', err);
        alert('Ocurrió un error al enviar la encuesta');
      }
    });
  }
}
