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

    // Angular Material
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


  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
  this.proyectoId = +this.route.snapshot.paramMap.get('proyectoId')!;

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

  // Debug extra
  setTimeout(() => {
    console.log('Form keys:', Object.keys(this.form.controls));
  });
}


  getEmoji(valor: number): string {
    if (valor <= 3) return '😠';
    if (valor <= 6) return '😐';
    return '😄';
  }

  getColor(valor: number): string {
    if (valor <= 3) return 'red';
    if (valor <= 6) return 'orange';
    return 'green';
  }

  enviar() {
    const data = {
      proyectoId: this.proyectoId,
      ...this.form.value
    };
    this.http.post('/api/encuesta/guardar', data).subscribe(() => {
      alert('Gracias por tu respuesta');
      this.form.reset();
    });
  }
}
