import { Component, Inject, OnInit } from '@angular/core';
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
import { SurveysProductsService } from '../surveys.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-survey-dialog',
    templateUrl: './survey-dialog.component.html',
    styleUrls: ['./survey-dialog.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSliderModule,
        MatSelectModule,
        MatRadioModule,
        MatButtonModule
    ]
})
export class SurveysComponent implements OnInit {
    form: FormGroup;
    id: number = 0;

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
        private surveyService: SurveysProductsService,
        public dialogRef: MatDialogRef<SurveysComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) { }

    ngOnInit(): void {
        this.id = this.data.id || 0;
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

        this.form.patchValue({
            nombre: this.data.nombre || '',
            empresa: this.data.empresa || '',
            email: this.data.email || '',
            telefono: this.data.telefono || '',
            cargo: this.data.cargo || '',
            sucursal: this.data.sucursal || '',

            servicioPersonal: this.data.servicioPersonal ?? 5,
            recomendarProductos: this.data.recomendarProductos ?? 5,
            ayudaProducto: this.data.ayudaProducto ?? 5,
            comprensionNecesidades: this.data.comprensionNecesidades ?? 5,
            tiempoEntrega: this.data.tiempoEntrega ?? 5,

            razonServicio: this.data.razonServicio || '',
            productosDeseados: this.data.productosDeseados || '',
            comoConocio: this.data.comoConocio || ''
        });

    }
}
