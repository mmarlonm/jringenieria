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
import { SurveysService } from '../surveys.service';
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
        HttpClientModule,
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
        private surveyService: SurveysService,
        public dialogRef: MatDialogRef<SurveysComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) { }

    ngOnInit(): void {
        this.id = this.data.id || 0;
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

        this.surveyService.getSurveyById(this.id).subscribe((res) => {
            console.log("Survey data:", res);
            this.form.patchValue({
                nombre: res.data.nombre || '',
                empresa: res.data.empresa || '',
                email: res.data.email || '',
                telefono: res.data.telefono || '',
                servicioPersonal: res.data.servicioPersonal || 5,
                recomendarProductos: res.data.recomendarProductos || 5,
                ayudaProducto: res.data.ayudaProducto || 5,
                comprensionNecesidades: res.data.comprensionNecesidades || 5,
                tiempoEntrega: res.data.tiempoEntrega || 5,
                razonServicio: res.data.razonServicio || '',
                razonRecomendar: res.data.razonRecomendar || '',
                razonAyuda: res.data.razonAyuda || '',
                razonComprension: res.data.razonComprension || '',
                razonEntrega: res.data.razonEntrega || '',
                frecuencia: res.data.frecuencia || '',
                productosDeseados: res.data.productosDeseados || '',
                comoConocio: res.data.comoConocio || ''
            });
        });
    }
}
