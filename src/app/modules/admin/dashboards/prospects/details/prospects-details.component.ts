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
import { MAT_DATE_LOCALE } from "@angular/material/core";
@Component({
  selector: "app-prospects-details",
  templateUrl: "./prospects-details.component.html",
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
  ],
  providers: [
    { provide: LOCALE_ID, useValue: "es-ES" }, // Idioma general Angular
    { provide: MAT_DATE_LOCALE, useValue: "es-ES" }, // Idioma para Angular Material (como el Datepicker)
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
    "Facebook",
    "Instagram",
    "Twitter",
    "LinkedIn",
    "Recomendación",
    "Eventos",
    "Otros",
  ];
  mostrarCampoOtros: boolean = false;

  constructor(
    private fb: FormBuilder,
    private prospectosService: ProspectosService,
    private route: ActivatedRoute,
    public router: Router,
    private clientsService: ClientsService
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
    });

    // Verificar si "Otros" ya está seleccionado al cargar el formulario
    this.mostrarCampoOtros =
      this.prospectForm.get("comoSeObtuvo")?.value === "Otros";

    const userData = JSON.parse(this.prospectosService.userInformation);
    this.prospectForm.get("usuarioId").setValue(userData.usuario.id);

    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");
      if (!id || id === "new") {
        this.prospectsId = null; // Se trata de un nuevo proyecto
      } else {
        this.prospectsId = Number(id);
        this.loadProspects(this.prospectsId);
      }
    });
  }

  loadProspects(id: number): void {
    this.prospectosService.getProspectoById(id).subscribe((prospecto) => {
      if (prospecto) {
        // Verifica si "comoSeObtuvo" es "Otros" para activar el campo de texto adicional
        this.mostrarCampoOtros =
          prospecto.comoSeObtuvo === "Otros" ? true : false;
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
        });
      }
    });
  }

  saveProspect(): void {
    if (this.prospectForm.invalid) return;

    const quotesData: any = this.prospectForm.value;

    if (this.prospectsId) {
      // Actualizar proyecto
      quotesData.prospectoId = this.prospectsId;
      this.prospectosService.saveProspecto(quotesData).subscribe(() => {
        // Redirigir a la lista de proyectos
        this.router.navigate(["/dashboards/prospects"]); // O la ruta correspondiente a la lista
      });
    } else {
      // Crear nuevo proyecto
      this.prospectosService.saveProspecto(quotesData).subscribe(() => {
        // Redirigir a la lista de proyectos
        this.router.navigate(["/dashboards/prospects"]); // O la ruta correspondiente a la lista
      });
    }
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
}
