import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientsService } from '../clients.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import Swal from 'sweetalert2';
import { StarRatingModule, StarRatingConfigService } from 'angular-star-rating';
import {StarRatingBridgeModule} from './start-rating-bridge.module'


@Component({
  selector: 'app-clients-details',
  templateUrl: './clients-details.component.html',
  styleUrls:["./clientes-details.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    StarRatingBridgeModule
  ],
  })
export class ClientsDetailsComponent implements OnInit {
  clienteForm: FormGroup;
  categorias: any[] = [];
  unidadesDeNegocio: any[] = [];
  clientId: number | null = null;
  asentamientos: string[] = [];  // Lista de colonias disponibles
  estadosMexico: string[] = [
    "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
    "Chihuahua", "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero", "Hidalgo",
    "Jalisco", "México", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca",
    "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora",
    "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
  ];

  constructor(
    private fb: FormBuilder,
    private clientsService: ClientsService,
    private route: ActivatedRoute,
    public router: Router,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.clienteForm = this.fb.group({
        clienteId: [0],
        nombre: ['', Validators.required],
        direccion: [''],
        ciudad: [''],
        colonia: [''],
        estado: [''],
        pais: ['México', Validators.required],
        codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
        telefono: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        empresa: [''],
        rfc: [''],
        activo: [true],
        Calificacion:[3]
    });

    this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id === 'new') {
            this.clientId = null;
        } else {
            this.clientId = Number(id);
            this.loadClient(this.clientId);
        }
    });
  }

  getCategorias(): void {
    this.clientsService.getClient().subscribe(data => this.categorias = data);
  }

  loadClient(id: number): void {
    this.clientsService.getClientById(id).subscribe((cliente) => {
        if (cliente) {
            this.clienteForm.patchValue(cliente);
            this.clienteForm.get("Calificacion").setValue(cliente.calificacion)
        }
    });
  }

  saveClient(): void {
    if (this.clienteForm.invalid){
       Swal.fire({
                             icon: "error",
                             title:"Opps",
                             text:"Por favor, completa los campos obligatorios",
                             draggable: true
                           });   
                           return;                   
          
    };
  
    const clientData: any = this.clienteForm.value;
  
    if (this.clientId) {
      clientData.proyectoId = this.clientId;
      this.clientsService.updateClient(clientData).subscribe(() => {
        this.router.navigate(['/catalogs/clients']);
      });
    } else {
      this.clientsService.updateClient(clientData).subscribe(() => {
        this.router.navigate(['/catalogs/clients']);
      });
    }
  }

  /**
   * Obtiene dirección automáticamente por Código Postal
   */
  buscarDireccionPorCP(): void {
    const cp = this.clienteForm.get('codigoPostal')?.value;
    if (!cp || cp.length !== 5) return;

    const token = '5f76a85b-d1a1-47ce-8e81-3de0df42e11c';  // Reemplaza con tu token de COPOMEX
    const url = `https://api.copomex.com/query/info_cp/${cp}?token=${token}`;

    this.http.get<any[]>(url).subscribe(
      (data) => {
        if (data.length > 0) {
          
          const primerResultado = data[0].response; // Toma el primer resultado como referencia
          const estado = primerResultado.estado;
          const ciudad = primerResultado.ciudad;
          const asentamientos = data.map(item => item.response.asentamiento); // Lista de colonias

          if (this.estadosMexico.includes(estado)) {
            this.clienteForm.patchValue({
              ciudad,
              estado,
              pais: 'México'
            });

            // Agregar los asentamientos a un campo de selección en el formulario
            this.asentamientos = asentamientos; // Debes definir esta variable en la clase como: asentamientos: string[] = [];
          } else {
            this.snackBar.open('El estado recibido no es válido para México', 'Cerrar', { duration: 3000 });
          }
        } else {
          this.snackBar.open('No se encontraron datos para este código postal', 'Cerrar', { duration: 3000 });
        }
      },
      () => {
        this.snackBar.open('Error al obtener datos del código postal', 'Cerrar', { duration: 3000 });
      }
    );
}
}