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
import * as L from "leaflet";
import { MatTabsModule } from "@angular/material/tabs";
import { MatIconModule } from "@angular/material/icon";
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
    StarRatingBridgeModule,
    MatTabsModule,
    MatIconModule
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

  map: any;
  marker: any;
  latitud: number | null = null;
  longitud: number | null = null;

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
        Calificacion:[3],
        latitud: [null],
        longitud: [null],
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

    this.map = L.map("map").setView([19.4326, -99.1332], 6); // Ciudad de México
    
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(this.map);
    
        this.map.on("click", (e: any) => {
          this.latitud = e.latlng.lat;
          this.longitud = e.latlng.lng;
          this.setMarker(this.latitud, this.longitud);
        });
    
        if (this.latitud && this.longitud) {
          this.setMarker(this.latitud, this.longitud);
        }
  }

  getCategorias(): void {
    this.clientsService.getClient().subscribe(data => this.categorias = data);
  }

  loadClient(id: number): void {
    this.clientsService.getClientById(id).subscribe((cliente) => {
        if (cliente) {
          this.latitud = cliente.latitud;
          this.longitud = cliente.longitud;
            this.clienteForm.patchValue(cliente);
            this.clienteForm.get("Calificacion").setValue(cliente.calificacion || 3); // Valor por defecto
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
      clientData.latitud = this.latitud;
      clientData.longitud = this.longitud;
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

setMarker(lat: number, lng: number) {
    if (this.marker) this.map.removeLayer(this.marker);
    // 👉 Arregla los íconos del marcador para GitHub Pages
    const icon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const popupContent = `
      <b>Empresa:</b> ${this.clienteForm.value.nombre}<br>
      <b>Contacto:</b> ${this.clienteForm.value.telefono}<br>
      <b>Teléfono:</b> ${this.clienteForm.value.email}
    `;

    this.marker = L.marker([lat, lng], {
        draggable: true,
        icon,
      }).addTo(this.map).bindPopup(popupContent).openPopup();
    this.map.setView([lat, lng], 15);
  }

  buscarDireccion(direccion: string) {
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${direccion}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          this.latitud = lat;
          this.longitud = lon;
          this.setMarker(lat, lon);
        }
      });
  }

  onTabChange(event: any): void {
    const tabLabel = event.tab.textLabel;

    if (tabLabel === "Ubicación") {
      setTimeout(() => {
        if (!this.map) {
          this.initMap();
        } else {
          this.map.invalidateSize(); // Por si el mapa ya existe pero está oculto
        }
      }, 300); // Espera breve para asegurar que el DOM esté renderizado
    }
  }

  initMap(): void {
    const container = document.getElementById("map");
    if (!container) {
      console.error("Map container not found.");
      return;
    }

    // 👉 Arregla los íconos del marcador para GitHub Pages
    const icon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    this.map = L.map("map").setView([19.4326, -99.1332], 6); // México

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(this.map);

    // Si hay coordenadas existentes, mostrar el marcador con info
    if (this.latitud && this.longitud) {
      const popupContent = `
      <b>Empresa:</b> ${this.clienteForm.value.nombre}<br>
      <b>Contacto:</b> ${this.clienteForm.value.telefono}<br>
      <b>Teléfono:</b> ${this.clienteForm.value.email}
    `;

      this.marker = L.marker([this.latitud, this.longitud], {
        draggable: true,
        icon,
      })
        .addTo(this.map)
        .bindPopup(popupContent)
        .openPopup();

      this.map.setView([this.latitud, this.longitud], 14);

      this.marker.on("dragend", (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        this.latitud = lat;
        this.longitud = lng;
      });
    } else {
      // Clic en el mapa para colocar nuevo marcador
      this.map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        this.latitud = lat;
        this.longitud = lng;

        if (this.marker) {
          this.map.removeLayer(this.marker);
        }

        const popupContent = `
        <b>Empresa:</b> ${this.clienteForm.value.nombre}<br>
        <b>Contacto:</b> ${this.clienteForm.value.telefono}<br>
        <b>Teléfono:</b> ${this.clienteForm.value.email}
      `;

        this.marker = L.marker([lat, lng], { draggable: true, icon })
          .addTo(this.map)
          .bindPopup(popupContent)
          .openPopup();

        this.marker.on("dragend", (event: any) => {
          const { lat, lng } = event.target.getLatLng();
          this.latitud = lat;
          this.longitud = lng;
        });
      });
    }
  }
}