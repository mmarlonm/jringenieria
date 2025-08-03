import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
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
  form: FormGroup;
  proyectoId: number = 0;

  fields = [
    {
      label: '¿Cómo calificarías el servicio del personal que te atendió?',
      control: 'servicioPersonal',
      razon: 'razonServicio'
    },
    {
      label: '¿Qué posibilidades hay de que recomiendes nuestros productos?',
      control: 'recomendarProductos',
      razon: 'razonRecomendar'
    },
    {
      label: '¿En qué medida los productos ayudaron a resolver tu problema?',
      control: 'ayudaProducto',
      razon: 'razonAyuda'
    },
    {
      label: '¿Nuestro equipo comprendió tus necesidades?',
      control: 'comprensionNecesidades',
      razon: 'razonComprension'
    },
    {
      label: '¿Cómo evalúas calidad y tiempo de entrega?',
      control: 'tiempoEntrega',
      razon: 'razonEntrega'
    }
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

  encuestaYaRespondida = false;


  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient,
    private surveyService: SurveyService
  ) { }

  ngOnInit(): void {
    this.proyectoId = +this.route.snapshot.paramMap.get('id')!;
    this.form = this.fb.group({
      nombre: [''],
      empresa: [''],
      email: [''],
      telefono: [''],

      servicioPersonal: [5],
      recomendarProductos: [5],
      ayudaProducto: [5],
      comprensionNecesidades: [5],
      tiempoEntrega: [5],

      razonServicio: [''],
      razonRecomendar: [''],
      razonAyuda: [''],
      razonComprension: [''],
      razonEntrega: [''],

      frecuencia: [''],
      productosDeseados: [''],
      comoConocio: ['']
    });

    this.surveyService.existeEncuesta(this.proyectoId).subscribe((existe) => {
    this.encuestaYaRespondida = existe;

    if (existe) {
      this.form.disable(); // Desactiva el formulario si ya fue respondido
    }
  });
  }

  enviar() {
  const data: EncuestaDTO = {
    proyectoId: this.proyectoId,
    ...this.form.value
  };

  this.surveyService.guardarEncuesta(data).subscribe({
    next: (res) => {
      if (res.code === 200) {
        Swal.fire({
          icon: 'success',
          title: '¡Gracias!',
          text: 'Encuesta guardada exitosamente.',
          confirmButtonText: 'Aceptar'
        });
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
