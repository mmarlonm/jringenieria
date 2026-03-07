import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientsService } from './../../../catalogs/clients/clients.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { StarRatingModule, StarRatingConfigService } from 'angular-star-rating';
import { StarRatingBridgeModule } from './../../../catalogs/clients/details/start-rating-bridge.module';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';


@Component({
  selector: 'app-add-client',
  templateUrl: './add-client.component.html',
  styleUrls: ["./add-client.component.scss"],
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
export class AddClientComponent implements OnInit {
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
    private http: HttpClient,
    private _chatNotificationService: ChatNotificationService,
    public dialogRef: MatDialogRef<AddClientComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any // 👈 aquí se inyecta el dato
  ) { }

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
      Calificacion: [3]
    });

    // Si viene un ID en data, cargar datos del cliente
    if (this.data?.clienteId) {
      this.clientsService.getClientById(this.data.clienteId).subscribe(cliente => {
        this.clienteForm.patchValue(cliente);
        this.clientId = cliente.clienteId;
        this.clienteForm.get("Calificacion").setValue(cliente.calificacion || 3); // Valor por defecto
      });
    }
  }

  getCategorias(): void {
    this.clientsService.getClient().subscribe(data => this.categorias = data);
  }

  saveClient(): void {
    if (this.clienteForm.invalid) {
      this._chatNotificationService.showError("Oops", "Por favor, completa los campos obligatorios", 5000);
      return;
    }

    const clientData = this.clienteForm.value;

    this.clientsService.createClient(clientData).subscribe({
      next: (nuevoCliente) => {
        this._chatNotificationService.showSuccess('Cliente guardado', 'El cliente se ha guardado correctamente.', 3000);
        this.dialogRef.close(nuevoCliente); // 👈 Devuelve el cliente creado al padre
      },
      error: (error) => {
        console.error('Error al guardar el cliente:', error);
        this._chatNotificationService.showError('Error', 'No se pudo guardar el cliente. Inténtalo de nuevo más tarde.', 5000);
      }
    });
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
            this._chatNotificationService.showWarning('Advertencia', 'El estado recibido no es válido para México', 4000);
          }
        } else {
          this._chatNotificationService.showError('Error', 'No se encontraron datos para este código postal', 5000);
        }
      },
      () => {
        this._chatNotificationService.showError('Error', 'Error al obtener datos del código postal', 5000);
      }
    );
  }
}