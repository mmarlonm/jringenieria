import { Component, OnInit, LOCALE_ID } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ProspectosService } from "../prospects.services";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  FormControl,
  FormArray,
} from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { CommonModule } from "@angular/common";
import { CurrencyMaskPipe } from "../../../../../pipes/currency-mask.pipe";
import { ClientsService } from "../../../catalogs/clients/clients.service";
import { debounceTime } from "rxjs";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { registerLocaleData } from "@angular/common";
import localeEs from "@angular/common/locales/es";
import {
  MAT_DATE_FORMATS,
  DateAdapter,
  MAT_DATE_LOCALE,
} from "@angular/material/core";
import { UsersService } from "../../../security/users/users.service";
import { MatTabsModule } from "@angular/material/tabs";
import { MatIconModule } from "@angular/material/icon";
import { NotesDetailsComponent } from "../dialog/dialog.component";
import { MatDialog } from "@angular/material/dialog";
import Swal from "sweetalert2";
import * as L from "leaflet";
import { MomentDateAdapter } from "@angular/material-moment-adapter";

export const CUSTOM_DATE_FORMATS = {
  parse: {
    dateInput: "DD/MM/YYYY",
  },
  display: {
    dateInput: "DD/MM/YYYY",
    monthYearLabel: "MMM YYYY",
    dateA11yLabel: "LL",
    monthYearA11yLabel: "MMMM YYYY",
  },
};

@Component({
  selector: "app-prospects-details",
  templateUrl: "./prospects-details.component.html",
  styleUrls: ["./prospects-details.component.scss"],

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
    CurrencyMaskPipe,
    NgxMatSelectSearchModule,
    MatTabsModule,
    MatIconModule,
  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS },
  ],
})
export class ProspectDetailsComponent implements OnInit {
  prospectForm: FormGroup;
  estatus: any[] = [];
  unidadesDeNegocio: any[] = [];
  prospectsId: number | null = null;

  clienteFiltro = new FormControl("");
  filteredClients: any[] = [];
  clients: any[] = [];
  opcionesContacto: string[] = [
    "Web",
    "Whatsapp",
    "Facebook",
    "Correo Electrónico",
    "Teléfono",
    "Llamada",
    "Instagram",
    "Twitter",
    "LinkedIn",
    "Recomendación",
    "Eventos",
    "Otros",
  ];
  mostrarCampoOtros: boolean = false;

  //informacion de usuario logeado
  user: any[] = [];
  notes: any[] = []; // Lista de notas

  searchText: string = "";
  usuarioId: number;

  map: any;
  marker: any;
  latitud: number | null = null;
  longitud: number | null = null;

  constructor(
    private fb: FormBuilder,
    private prospectosService: ProspectosService,
    private route: ActivatedRoute,
    public router: Router,
    private clientsService: ClientsService,
    private _usersService: UsersService,
    private _matDialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.prospectForm = this.fb.group({
      prospectoId: [0], // ID del prospecto (0 cuando es nuevo)
      empresa: ["", [Validators.required, Validators.maxLength(255)]],
      contacto: ["", [Validators.required, Validators.maxLength(255)]],
      telefono: ["", [Validators.required, Validators.maxLength(50)]],
      puesto: ["", [Validators.maxLength(100)]],
      giroEmpresa: ["", [Validators.maxLength(255)]],
      email: ["", [Validators.email, Validators.maxLength(255)]],
      areaInteres: ["", [Validators.maxLength(255)]],
      tipoEmpresa: ["", [Validators.maxLength(255)]],
      usuarioId: [0, Validators.required], // ID del usuario que lo creó
      comoSeObtuvo: [""],
      otros: [""],
      personalSeguimiento: [null],
      latitud: [null],
      longitud: [null],

      // 🆕 Nuevos campos
      relacionComercial: [""],
      descripcion: [""],
      seguimiento: [""],
      llamada: [""],
      observaciones: [""],
      fechaAccion: [""],
      canalMedio: [""],

      emails: this.fb.array([this.createEmailField()]),
      telefonos: this.fb.array([this.createPhoneNumberField()]),
    });

    // Verificar si "Otros" ya está seleccionado al cargar el formulario
    this.mostrarCampoOtros =
      this.prospectForm.get("comoSeObtuvo")?.value === "Otros";

    const userData = JSON.parse(this.prospectosService.userInformation);
    this.usuarioId = userData.usuario.id;
    this.prospectForm.get("usuarioId").setValue(userData.usuario.id);

    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");
      if (!id || id === "new") {
        this.prospectsId = null; // Se trata de un nuevo proyecto
      } else {
        this.prospectsId = Number(id);
        this.loadProspects(this.prospectsId);
        this.loadNotes(this.prospectsId); // Cargar notas relacionadas
      }
    });

    this.getUsers();
  }

  loadProspects(id: number): void {
    this.prospectosService.getProspectoById(id).subscribe((res) => {
      if (res.code == 200) {
        const prospecto = res.data;

        if (prospecto) {
          this.mostrarCampoOtros = prospecto.comoSeObtuvo === "Otros";

          // Primero limpiamos los FormArray actuales
          this.emails.clear();
          this.telefonos.clear();

          // Si hay emails en el prospecto, los agregamos al FormArray
          if (prospecto.emails && prospecto.emails.length > 0) {
            prospecto.emails.forEach((emailObj: any) => {
              this.emails.push(
                this.fb.group({
                  email: [emailObj.email],
                  descripcion: [emailObj.descripcion],
                })
              );
            });
          } else {
            // Si no hay, agregamos uno vacío
            this.addEmailField();
          }

          // Si hay teléfonos en el prospecto, los agregamos al FormArray
          if (prospecto.telefonos && prospecto.telefonos.length > 0) {
            prospecto.telefonos.forEach((phoneObj: any) => {
              this.telefonos.push(
                this.fb.group({
                  telefono: [phoneObj.telefono],
                  descripcion: [phoneObj.descripcion],
                })
              );
            });
          } else {
            // Si no hay, agregamos uno vacío
            this.addPhoneNumberField();
          }
          this.latitud = prospecto.latitud;
          this.longitud = prospecto.longitud;
          // Asignación de los demás campos
          this.prospectForm.patchValue({
            prospectoId: prospecto.prospectoId,
            empresa: prospecto.empresa,
            contacto: prospecto.contacto,
            telefono: prospecto.telefono,
            puesto: prospecto.puesto,
            giroEmpresa: prospecto.giroEmpresa,
            email: prospecto.email,
            areaInteres: prospecto.areaInteres,
            tipoEmpresa: prospecto.tipoEmpresa,
            usuarioId: prospecto.usuarioId,
            comoSeObtuvo: prospecto.comoSeObtuvo,
            otros: prospecto.otros,
            personalSeguimiento: prospecto.personalSeguimiento,
            latitud: prospecto.latitud,
            longitud: prospecto.longitud,
            relacionComercial: prospecto.relacionComercial,
            descripcion: prospecto.descripcion,
            seguimiento: prospecto.seguimiento,
            llamada: prospecto.llamada,
            observaciones: prospecto.observaciones,
            fechaAccion: prospecto.fechaAccion,
            canalMedio: prospecto.canalMedio,
          });
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Opps",
          text: "Hubo un error en el sistema, contacte al administrador del sistema.",
          draggable: true,
        });
      }
    });
  }

  // Cargar notas del prospecto
  loadNotes(prospectId: number): void {
    this.prospectosService.getNotas(prospectId).subscribe((notes) => {
      this.notes = notes;
    });
  }

  saveProspect(): void {
    if (this.prospectForm.invalid) {
      Swal.fire({
        icon: "error",
        title: "Opps",
        text: "Por favor, completa los campos obligatorios",
        draggable: true,
      });
      return;
    }

    const quotesData: any = this.prospectForm.value;

    if (this.prospectsId) {
      // Actualizar proyecto
      quotesData.prospectoId = this.prospectsId;
    }
    const datos = {
      ...quotesData,
      latitud: this.latitud,
      longitud: this.longitud,
    };
    this.prospectosService.saveProspecto(datos).subscribe((res) => {
      if (res.code == 200) {
        // Redirigir a la lista de proyectos
        this.router.navigate(["/dashboards/prospects"]); // O la ruta correspondiente a la lista
      } else {
        Swal.fire({
          icon: "error",
          title: "Opps",
          text: "Hubo un error en el sistema, contacte al administrador del sistema.",
          draggable: true,
        });
      }
    });
  }

  updateValue(event: Event, controlName: string) {
    let input = event.target as HTMLInputElement;

    // Remover caracteres no numéricos excepto el punto decimal
    let rawValue = input.value.replace(/[^0-9.]/g, "");

    // Actualizar el FormControl dinámicamente
    this.prospectForm.get(controlName)?.setValue(rawValue);
  }

  onComoSeObtuvoChange(value: string) {
    this.mostrarCampoOtros = value === "Otros";
    if (!this.mostrarCampoOtros) {
      this.prospectForm.get("otros")?.setValue(""); // Limpiar campo si no es "Otros"
    }
  }

  getUsers(): void {
    this._usersService.getUsers().subscribe((users) => {
      this.user = users.filter(
        (user) => user.rolId !== 1 && user.rolId !== 3 && user.activo !== false
      );
    });
  }

  // Abrir modal para agregar una nueva nota
  addNewNote(): void {
    const dialogRef = this._matDialog.open(NotesDetailsComponent, {
      autoFocus: false,
      data: { note: { idNote: 0, title: "", content: "" } },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        result.prospectoId = this.prospectsId; // Vincular la nota al prospecto
        result.usuarioId = this.usuarioId;
        this.notes.push(result); // Agregar la nueva nota a la lista
        this.prospectosService.saveNote(result).subscribe();
      }
    });
  }

  // Abrir modal para editar una nota existente
  editNote(note: any): void {
    const dialogRef = this._matDialog.open(NotesDetailsComponent, {
      autoFocus: false,
      data: { note },
    });

    dialogRef.afterClosed().subscribe((updatedNote) => {
      if (updatedNote) {
        const index = this.notes.findIndex(
          (n) => n.idNote === updatedNote.idNote
        );
        if (index !== -1) {
          this.notes[index] = updatedNote; // Actualizar la nota en la lista
          this.prospectosService.saveNote(updatedNote).subscribe();
        }
      }
    });
  }

  // Eliminar una nota
  deleteNote(noteId: number): void {
    this.notes = this.notes.filter((n) => n.idNote !== noteId);
    this.prospectosService.deleteNote(noteId).subscribe((res) => {
      this.loadNotes(this.prospectsId);
    });
  }

  get filteredNotes() {
    return this.notes.filter(
      (note) =>
        note.title.toLowerCase().includes(this.searchText.toLowerCase()) ||
        note.content.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  // Getters para acceder fácilmente a los arrays
  get emails(): FormArray {
    return this.prospectForm.get("emails") as FormArray;
  }

  get telefonos(): FormArray {
    return this.prospectForm.get("telefonos") as FormArray;
  }

  // Funciones para crear campos
  createEmailField(): FormGroup {
    return this.fb.group({
      email: ["", [Validators.email]],
      descripcion: [""],
    });
  }

  createPhoneNumberField(): FormGroup {
    return this.fb.group({
      telefono: [""],
      descripcion: [""],
    });
  }

  // Agregar campos
  addEmailField(): void {
    this.emails.push(this.createEmailField());
  }

  addPhoneNumberField(): void {
    this.telefonos.push(this.createPhoneNumberField());
  }

  // Eliminar campos
  removeEmailField(index: number): void {
    this.emails.removeAt(index);
  }

  removePhoneNumberField(index: number): void {
    this.telefonos.removeAt(index);
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
      <b>Empresa:</b> ${this.prospectForm.value.empresa}<br>
      <b>Contacto:</b> ${this.prospectForm.value.contacto}<br>
      <b>Teléfono:</b> ${this.prospectForm.value.telefono}
    `;

    this.marker = L.marker([lat, lng], {
      draggable: true,
      icon,
    })
      .addTo(this.map)
      .bindPopup(popupContent)
      .openPopup();
    this.map.setView([lat, lng], 15);
  }

  buscarDireccion(direccion: string) {
    // Un solo flujo para manejar todos los casos:
    const cidRegex = /google\.com\/maps\?cid=(\d+)/;
    const shortLinkRegex = /https?:\/\/maps\.app\.goo\.gl\/[A-Za-z0-9]+/;
    const coordRegex = /^\s*(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)\s*$/;
    // Google Maps URL with @lat,lng,zoom (e.g. https://www.google.com/maps/@19.432608,-99.133209,15z)
    const atLatLngRegex = /@(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)(?:,|\/)/;

    // 1. Detectar Google Maps CID links
    const matchCid = direccion.match(cidRegex);
    if (matchCid) {
      const cid = matchCid[1];
      const apiKey: string = "AIzaSyCnhkYFNO57qkBrvOaIFJwZy6vDYtJMncg"; // 👉 pon aquí tu API Key de Google
      if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
        Swal.fire({
          icon: "warning",
          title: "Atención",
          text: "Para buscar enlaces de Google Maps con CID necesitas configurar una API Key de Google Places.",
        });
        return;
      }
      const url = `https://maps.googleapis.com/maps/api/place/details/json?cid=${cid}&key=${apiKey}`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data?.result?.geometry?.location) {
            const lat = data.result.geometry.location.lat;
            const lng = data.result.geometry.location.lng;
            this.latitud = lat;
            this.longitud = lng;
            this.setMarker(lat, lng);
          } else {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: "No se pudieron obtener coordenadas para este enlace de Google Maps.",
            });
          }
        })
        .catch((err) => {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Hubo un problema al contactar Google Places API.",
          });
          console.error("Error al obtener coordenadas:", err);
        });
      return;
    }

    // 2. Detectar enlaces de Google Maps con @lat,lng,zoom en la URL
    const matchAtLatLng = direccion.match(atLatLngRegex);
    if (matchAtLatLng) {
      const lat = parseFloat(matchAtLatLng[1]);
      const lng = parseFloat(matchAtLatLng[3]);
      if (!isNaN(lat) && !isNaN(lng)) {
        this.latitud = lat;
        this.longitud = lng;
        this.setMarker(lat, lng);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Coordenadas inválidas en el enlace de Google Maps.",
        });
      }
      return;
    }

    // 3. Detectar Google Maps short links (maps.app.goo.gl/...)
    const matchShort = direccion.match(shortLinkRegex);
    if (matchShort) {
      // Intentar resolver el shortlink
      fetch(matchShort[0], { method: "HEAD", redirect: "follow" })
        .then((res) => {
          // Algunos navegadores bloquean CORS en HEAD, intentar GET si falla
          if (res && res.url && res.url !== matchShort[0]) {
            // Llamar recursivamente con la URL final
            this.buscarDireccion(res.url);
          } else {
            // Si no se pudo resolver, intentar con GET
            fetch(matchShort[0], { method: "GET", redirect: "follow" })
              .then((res2) => {
                if (res2 && res2.url && res2.url !== matchShort[0]) {
                  this.buscarDireccion(res2.url);
                } else {
                  Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "No se pudo resolver el shortlink de Google Maps. Intenta pegar el enlace largo.",
                  });
                }
              })
              .catch((err2) => {
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: "No se pudo resolver el shortlink de Google Maps.",
                });
                console.error("Error al resolver shortlink (GET):", err2);
              });
          }
        })
        .catch((err) => {
          // Si HEAD falla, intentar GET
          fetch(matchShort[0], { method: "GET", redirect: "follow" })
            .then((res2) => {
              if (res2 && res2.url && res2.url !== matchShort[0]) {
                this.buscarDireccion(res2.url);
              } else {
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: "No se pudo resolver el shortlink de Google Maps. Intenta pegar el enlace largo.",
                });
              }
            })
            .catch((err2) => {
              Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo resolver el shortlink de Google Maps.",
              });
              console.error("Error al resolver shortlink (GET):", err2);
            });
          console.error("Error al resolver shortlink (HEAD):", err);
        });
      return;
    }

    // 4. Detectar coordenadas (lat,lon)
    const matchCoords = direccion.match(coordRegex);
    if (matchCoords) {
      const lat = parseFloat(matchCoords[1]);
      const lng = parseFloat(matchCoords[3]);
      if (!isNaN(lat) && !isNaN(lng)) {
        this.latitud = lat;
        this.longitud = lng;
        this.setMarker(lat, lng);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Coordenadas inválidas.",
        });
      }
      return;
    }

    // 5. Buscar como dirección normal usando Nominatim
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          this.latitud = lat;
          this.longitud = lng;
          this.setMarker(lat, lng);
        } else {
          Swal.fire({
            icon: "info",
            title: "Sin resultados",
            text: "No se encontraron coordenadas para esta dirección.",
          });
        }
      })
      .catch((err) => {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Error al buscar la dirección.",
        });
        console.error("Error al buscar dirección en Nominatim:", err);
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

    this.map.on("click", (e: any) => {
      this.latitud = e.latlng.lat;
      this.longitud = e.latlng.lng;
      this.setMarker(this.latitud, this.longitud);
    });

    // Si hay coordenadas existentes, mostrar el marcador con info
    if (this.latitud && this.longitud) {
      const popupContent = `
      <b>Empresa:</b> ${this.prospectForm.value.empresa}<br>
      <b>Contacto:</b> ${this.prospectForm.value.contacto}<br>
      <b>Teléfono:</b> ${this.prospectForm.value.telefono}
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
    } else if (this.prospectsId === null) {
      // Si es un nuevo prospecto y no hay lat/lng, intentar obtener la ubicación del usuario
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.latitud = position.coords.latitude;
            this.longitud = position.coords.longitude;
            this.setMarker(this.latitud, this.longitud);
          },
          (error) => {
            // Si falla la geolocalización, no hacer nada, dejar el mapa en vista por defecto
          }
        );
      }
      // Clic en el mapa para colocar nuevo marcador
      this.map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        this.latitud = lat;
        this.longitud = lng;

        if (this.marker) {
          this.map.removeLayer(this.marker);
        }

        const popupContent = `
        <b>Empresa:</b> ${this.prospectForm.value.empresa}<br>
        <b>Contacto:</b> ${this.prospectForm.value.contacto}<br>
        <b>Teléfono:</b> ${this.prospectForm.value.telefono}
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
        <b>Empresa:</b> ${this.prospectForm.value.empresa}<br>
        <b>Contacto:</b> ${this.prospectForm.value.contacto}<br>
        <b>Teléfono:</b> ${this.prospectForm.value.telefono}
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
