import { Component, OnInit, LOCALE_ID } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { QuotesService } from "../quotes.service";
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
import { ProspectosService } from "../../prospects/prospects.services";
import { debounceTime } from "rxjs";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { registerLocaleData } from "@angular/common";
import localeEs from "@angular/common/locales/es";
import { MAT_DATE_LOCALE } from "@angular/material/core";
@Component({
  selector: "app-quotes-details",
  templateUrl: "./quotes-details.component.html",
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
export class QuoteDetailsComponent implements OnInit {
  quotesForm: FormGroup;
  estatus: any[] = [];
  unidadesDeNegocio: any[] = [];
  quotesId: number | null = null;

  clienteFiltro = new FormControl("");
  filteredClients: any[] = [];
  clients: any[] = [];

  prospectFiltro = new FormControl("");
  filteredProspects: any[] = [];
  prospects: any[] = [];

  constructor(
    private fb: FormBuilder,
    private quotesService: QuotesService,
    private route: ActivatedRoute,
    public router: Router,
    private clientsService: ClientsService,
    private prospectsService: ProspectosService
  ) {}

  ngOnInit(): void {
    this.quotesForm = this.fb.group({
      cotizacionId: [0], // ✅ Debe ser número
      cliente: [0], // 🔹 Cambiar de '' a 0
      prospecto: [0], // 🔹 Cambiar de '' a 0
      usuarioCreadorId: [0, Validators.required], // 🔹 Cambiar de '' a 0
      necesidad: ["", [Validators.required, Validators.maxLength(500)]],
      direccion: ["", [Validators.maxLength(255)]],
      nombreContacto: ["", [Validators.maxLength(255)]],
      telefono: ["", [Validators.maxLength(50)]],
      empresa: ["", [Validators.maxLength(255)]],
      cotizacion: ["", [Validators.maxLength(255)]],
      ordenCompra: ["", [Validators.maxLength(255)]],
      contrato: ["", [Validators.maxLength(255)]],
      proveedor: ["", [Validators.maxLength(255)]],
      vendedor: ["", [Validators.maxLength(255)]],
      fechaEntrega: [null], // ✅ Debe ser Date o null
      rutaCritica: ["", [Validators.maxLength(500)]],
      factura: ["", [Validators.maxLength(255)]],
      pago: [null, Validators.pattern(/^\d+(\.\d{1,2})?$/)], // ✅ Debe ser número o null
      utilidadProgramada: [null, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      utilidadReal: [null, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      financiamiento: [null, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      fechaRegistro: [new Date()], // ✅ Enviar como `Date`
      estatus: [0, [Validators.maxLength(50)]],
      formaPago: [""],
      tiempoEntrega: [""],
      montoTotal: [""],
      ajustesCostos: [""],
      comentarios: [""],
    });
    this.getEstatus();
    this.getClientes();
    this.getProspects();

    const userData = JSON.parse(this.quotesService.userInformation);
    this.quotesForm.get("usuarioCreadorId").setValue(userData.usuario.id);

    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");
      if (!id || id === "new") {
        this.quotesId = null; // Se trata de un nuevo proyecto
      } else {
        this.quotesId = Number(id);
        this.loadQuotes(this.quotesId);
      }
    });

    // Al cambiar cliente, deshabilita prospecto
    this.quotesForm.get("cliente")?.valueChanges.subscribe((clienteId) => {
      const prospectoControl = this.quotesForm.get("prospecto");
      if (clienteId) {
        prospectoControl?.disable({ emitEvent: false });
        prospectoControl?.reset(); // Limpia selección
      } else {
        prospectoControl?.enable({ emitEvent: false });
      }
    });

    // Al cambiar prospecto, deshabilita cliente
    this.quotesForm.get("prospecto")?.valueChanges.subscribe((prospectoId) => {
      const clienteControl = this.quotesForm.get("cliente");
      if (prospectoId) {
        clienteControl?.disable({ emitEvent: false });
        clienteControl?.reset(); // Limpia selección
      } else {
        clienteControl?.enable({ emitEvent: false });
      }
    });
  }

  getEstatus(): void {
    this.quotesService.getEstatus().subscribe((data) => (this.estatus = data));
  }

  loadQuotes(id: number): void {
    this.quotesService.getQuoteById(id).subscribe((quotes) => {
      if (quotes) {
        this.quotesForm.patchValue({
          cotizacionId: quotes.cotizacionId, // 🔹 Ahora se incluye el ID
          cliente: quotes.cliente,
          prospecto: quotes.prospecto,
          usuarioCreadorId: quotes.usuarioCreadorId,
          necesidad: quotes.necesidad,
          direccion: quotes.direccion,
          nombreContacto: quotes.nombreContacto,
          telefono: quotes.telefono,
          empresa: quotes.empresa,
          cotizacion: quotes.cotizacion,
          ordenCompra: quotes.ordenCompra,
          contrato: quotes.contrato,
          proveedor: quotes.proveedor,
          vendedor: quotes.vendedor,
          fechaEntrega: quotes.fechaEntrega,
          rutaCritica: quotes.rutaCritica,
          factura: quotes.factura,
          pago: quotes.pago,
          utilidadProgramada: quotes.utilidadProgramada,
          utilidadReal: quotes.utilidadReal,
          financiamiento: quotes.financiamiento,
          fechaRegistro: quotes.fechaRegistro,
          estatus: quotes.estatus,
          formaPago: quotes.formaPago,
          tiempoEntrega: quotes.tiempoEntrega,
          montoTotal: quotes.montoTotal,
          ajustesCostos: quotes.ajustesCostos,
          comentarios: quotes.comentarios,
        });
      }
    });
  }

  saveQuotes(): void {
    if (this.quotesForm.invalid) return;

    const quotesData: any = this.quotesForm.value;

    if (this.quotesId) {
      // Actualizar proyecto
      quotesData.cotizacionId = this.quotesId;
      this.quotesService.updateQuote(quotesData).subscribe(() => {
        // Redirigir a la lista de proyectos
        this.router.navigate(["/dashboards/quote"]); // O la ruta correspondiente a la lista
      });
    } else {
      // Crear nuevo proyecto
      this.quotesService.createQuote(quotesData).subscribe(() => {
        // Redirigir a la lista de proyectos
        this.router.navigate(["/dashboards/quote"]); // O la ruta correspondiente a la lista
      });
    }
  }

  updateValue(event: Event, controlName: string) {
    let input = event.target as HTMLInputElement;

    // Remover caracteres no numéricos excepto el punto decimal
    let rawValue = input.value.replace(/[^0-9.]/g, "");

    // Actualizar el FormControl dinámicamente
    this.quotesForm.get(controlName)?.setValue(rawValue);
  }

  getClientes(): void {
    this.clientsService.getClient().subscribe((data) => {
      this.clients = data;
      this.filteredClients = this.clients;

      // Suscribirse al filtro con debounce
      this.clienteFiltro.valueChanges
        .pipe(debounceTime(200))
        .subscribe((value: string) => {
          const filterValue = value?.toLowerCase() || "";
          this.filteredClients = this.clients.filter((client) =>
            `${client.clienteId} - ${client.nombre}`
              .toLowerCase()
              .includes(filterValue)
          );
        });
    });
  }

  getProspects(): void {
    this.prospectsService.getProspectos().subscribe((data) => {
      this.prospects = data;
      this.filteredProspects = this.prospects;

      // Suscribirse al filtro con debounce
      this.prospectFiltro.valueChanges
        .pipe(debounceTime(200))
        .subscribe((value: string) => {
          const filterValue = value?.toLowerCase() || "";
          this.filteredProspects = this.prospects.filter((prospect) =>
            `${prospect.prospectoId} - ${prospect.empresa}`
              .toLowerCase()
              .includes(filterValue)
          );
        });
    });
  }
}
