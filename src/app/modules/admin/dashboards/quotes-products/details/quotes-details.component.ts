import { Component, OnInit, LOCALE_ID } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { QuotesService } from "../quotes-products.service";
import {
  FormBuilder,
  FormGroup,
  FormArray,
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
import { ChatNotificationService } from "app/shared/components/chat-notification/chat-notification.service";
import { CommonModule } from "@angular/common";
import { CurrencyMaskPipe } from "../../../../../pipes/currency-mask.pipe";
import { ClientsService } from "../../../catalogs/clients/clients.service";
import { ProspectosService } from "../../prospects/prospects.services";
import { debounceTime, forkJoin } from "rxjs";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { registerLocaleData } from "@angular/common";
import localeEs from "@angular/common/locales/es";

registerLocaleData(localeEs);
import { MAT_DATE_LOCALE } from "@angular/material/core";
import { ChangeDetectorRef } from "@angular/core";
import { MatTabsModule } from "@angular/material/tabs";
import { MatIconModule } from "@angular/material/icon";
import { MatDialog } from "@angular/material/dialog";
import { ProjectService } from "../../project/project.service";
import { AddClientComponent } from "../add-client/add-client.component";
import { QuotePdfDialogComponent } from "../quote-pdf-dialog/quote-pdf-dialog.component";
import { MatSlideToggle } from "@angular/material/slide-toggle";
import { MatTooltipModule } from "@angular/material/tooltip";
import { CondicionesSgcComponent } from "../sgc/condiciones-sgc/condiciones-sgc.component";
import { PartidasSgcComponent } from "../sgc/partidas-sgc/partidas-sgc.component";
import { AlcanceSgcComponent } from "../sgc/alcance-sgc/alcance-sgc.component";
import { EtapaChipComponent } from "../sgc/etapa-chip/etapa-chip.component";
import {
  AccionesSgc,
  CatalogosSgc,
  CotizacionSgcCabecera,
  CotizacionSgcDatos,
  GuardarCotizacionSgc,
  PartidaSgc,
  TotalesSgc
} from "../quotes-products.types";
import { totalesSgc } from "../sgc/cotizacion-sgc.utils";

@Component({
  selector: "app-quotes-details",
  templateUrl: "./quotes-details.component.html",
  styleUrls: ["./quotes-details.component.scss"],
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
    MatSlideToggle,
    MatTooltipModule,
    CondicionesSgcComponent,
    PartidasSgcComponent,
    AlcanceSgcComponent,
    EtapaChipComponent,
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
  cotizacionFile: File | null = null;
  files: any[] = [];
  selectedClienteId: number | null = null;

  // Totales
  subtotal = 0;
  iva = 0;
  total = 0;

  cotizacion: any;

  // Propiedades SGC (SGC-PRO-COM-03)
  sgcForm: FormGroup;
  selectedTabIndex: number = 0;
  catalogos: CatalogosSgc | null = null;
  catalogoError: boolean = false;
  faltantes: string[] = [];
  erroresGuardado: string[] = [];
  guardando: boolean = false;
  folio: string | null = null;
  version: number | null = null;
  etapa: string = 'Borrador';
  acciones: AccionesSgc = {
    editar: true,
    enviarRevision: false,
    volverBorrador: false,
    revisar: [],
    emitir: false,
    nuevaVersion: false,
  };
  soloLectura: boolean = false;
  esHeredada: boolean = false;
  partidas: PartidaSgc[] = [];
  partidasFormArray: FormArray;
  totales: TotalesSgc = {
    subtotal: 0,
    iva: 0,
    total: 0,
    costoDirecto: 0,
    utilidad: null,
    margenPorcentaje: null,
    margenBajo: false,
    partidasSinCosto: 0,
  };

  get mensajeFranjaSoloLectura(): string {
    const etapaTexto = this.etapa === 'EnRevision' ? 'en revisión' : `en ${this.etapa}`;
    return `Esta cotización está ${etapaTexto} (v${this.version || 1}) y no se puede editar.`;
  }

  constructor(
    private fb: FormBuilder,
    private quotesService: QuotesService,
    private route: ActivatedRoute,
    public router: Router,
    private clientsService: ClientsService,
    private prospectsService: ProspectosService,
    private _chatNotificationService: ChatNotificationService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private projectService: ProjectService
  ) { }

  ngOnInit(): void {
    this.quotesForm = this.fb.group({
      cotizacionProductosId: [0], // Cambiar de `cotizacionId` a `cotizacionProductosId`
      clienteId: [0, Validators.required],
      unidadDeNegocioId: [0, Validators.required],
      usuarioId: [0, Validators.required],
      requisitosEspeciales: [false, Validators.required],
      createdDate: [new Date()],
      updatedDate: [null],

      // Datos desnormalizados del cliente
      nombreCliente: [null, [Validators.maxLength(200)]],
      nombreEmpresa: [null, [Validators.maxLength(200)]],
      correo: [null, [Validators.email, Validators.maxLength(200)]],
      telefono: [null, [Validators.maxLength(50)]],
      rfc: [null, [Validators.maxLength(50)]],
      direccionCompleta: [null, [Validators.maxLength(300)]],
      estado: [null, [Validators.maxLength(100)]],
      estatus: [0, [Validators.maxLength(50)]],
      observaciones: [null, [Validators.maxLength(300)]],
    });
    this.getEstatus();
    this.getClientes();
    this.getProspects();

    const userData = JSON.parse(this.quotesService.userInformation);
    this.quotesForm.get("usuarioId").setValue(userData.usuario.id);

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

    this.getUnidadesDeNegocio();

    this.quotesForm
      .get("clienteId")
      ?.valueChanges.subscribe((clienteId: number | null) => {
        this.selectedClienteId = clienteId;
      });

    // Inicialización del formulario SGC
    this.sgcForm = this.fb.group({
      tipo: ['CS', [Validators.required]],
      moneda: ['MXN', [Validators.required]],
      tipoCambio: [null],
      vigenciaDias: [15, [Validators.required, Validators.min(1), Validators.max(365)]],
      penalizacionCancelacion: [null, [Validators.maxLength(500)]],
      formaPago: [null, [Validators.maxLength(200)]],
      condicionesPago: [null, [Validators.maxLength(1000)]],
      puntoEntrega: [null, [Validators.maxLength(300)]],
      condicionesEntrega: [null, [Validators.maxLength(1000)]],
      cuentaDeposito: [null, [Validators.maxLength(500)]],
      exclusiones: [null, [Validators.maxLength(2000)]],
      observacionesRelevantes: [null, [Validators.maxLength(2000)]],
      contactoNombre: [null, [Validators.maxLength(200)]],
      contactoCorreo: [null, [Validators.email, Validators.maxLength(200)]],
      contactoTelefono: [null, [Validators.maxLength(50)]],
      anexosTecnicos: [null, [Validators.maxLength(1000)]],
      alcanceTecnico: [null],
      recursosRequeridos: [null],
      personalInvolucrado: [null],
      tiemposEstimados: [null],
      supuestosOperativos: [null],
      condicionesEjecucion: [null],
      riesgosLimitaciones: [null],
      entregables: [[]],
      costosIndirectos: [null, [Validators.min(0)]],
      margenAutorizadoPorcentaje: [null, [Validators.min(0), Validators.max(100)]],
    });

    this.sgcForm.get('moneda')?.valueChanges.subscribe((moneda) => {
      this.actualizarValidacionTipoCambio(moneda);
    });

    this.sgcForm.get('costosIndirectos')?.valueChanges.subscribe(() => {
      this.calcularTotales();
    });

    this.sgcForm.get('margenAutorizadoPorcentaje')?.valueChanges.subscribe(() => {
      this.calcularTotales();
    });

    this.partidasFormArray = this.fb.array([]);
    this.partidasFormArray.valueChanges.subscribe(() => {
      this.partidas = this.partidasFormArray.value;
      this.calcularTotales();
    });

    this.cargarCatalogos();
  }

  actualizarValidacionTipoCambio(moneda: string): void {
    const tcControl = this.sgcForm.get('tipoCambio');
    if (moneda === 'USD') {
      tcControl?.setValidators([Validators.required, Validators.min(0.0001)]);
    } else {
      tcControl?.clearValidators();
      tcControl?.setValue(null, { emitEvent: false });
    }
    tcControl?.updateValueAndValidity();
  }

  cargarCatalogos(): void {
    this.catalogoError = false;
    this.quotesService.catalogosSgc().subscribe({
      next: (cat) => {
        this.catalogos = cat;
        this.catalogoError = false;
      },
      error: () => {
        this.catalogoError = true;
      },
    });
  }

  loadQuotes(id: number): void {
    forkJoin({
      vieja: this.quotesService.getQuoteById(id),
      sgcRes: this.quotesService.obtenerSgc(id),
    }).subscribe({
      next: ({ vieja, sgcRes }) => {
        if (vieja && vieja.code === 200) {
          const quotes = vieja.data;
          this.cotizacion = quotes;
          this.quotesForm.patchValue({
            cotizacionProductosId: quotes.cotizacionProductosId,
            clienteId: quotes.clienteId,
            unidadDeNegocioId: quotes.unidadDeNegocioId,
            usuarioId: quotes.usuarioId,
            requisitosEspeciales: quotes.requisitosEspeciales,
            createdDate: quotes.createdDate,
            updatedDate: quotes.updatedDate,
            nombreCliente: quotes.nombreCliente,
            nombreEmpresa: quotes.nombreEmpresa,
            correo: quotes.correo,
            telefono: quotes.telefono,
            rfc: quotes.rfc,
            direccionCompleta: quotes.direccionCompleta,
            estado: quotes.estado,
            estatus: quotes.estatus,
            observaciones: quotes.observaciones,
          });
        }

        if (sgcRes) {
          this.partidas = sgcRes.partidas || [];
          this.sincronizarPartidasFormArray(this.partidas);
          this.faltantes = sgcRes.faltantes || [];

          this.acciones = sgcRes.acciones || {
            editar: true,
            enviarRevision: false,
            volverBorrador: false,
            revisar: [],
            emitir: false,
            nuevaVersion: false,
          };

          if (sgcRes.sgc) {
            this.esHeredada = false;
            this.folio = sgcRes.sgc.folio;
            this.version = sgcRes.sgc.version;
            this.etapa = sgcRes.sgc.etapa || 'Borrador';
            this.sgcForm.patchValue(sgcRes.sgc);
            this.actualizarValidacionTipoCambio(sgcRes.sgc.moneda);
          } else {
            this.esHeredada = !!sgcRes.partidasHeredadas;
            this.folio = null;
            this.version = null;
            this.etapa = 'Borrador';
            this.sgcForm.patchValue({
              tipo: 'CS',
              moneda: 'MXN',
              tipoCambio: null,
              vigenciaDias: 15,
              entregables: [],
            });
            this.actualizarValidacionTipoCambio('MXN');
          }

          if (!this.acciones.editar) {
            this.soloLectura = true;
            this.quotesForm.disable({ emitEvent: false });
            this.sgcForm.disable({ emitEvent: false });
            this.partidasFormArray.disable({ emitEvent: false });
          } else {
            this.soloLectura = false;
            this.quotesForm.enable({ emitEvent: false });
            this.sgcForm.enable({ emitEvent: false });
            this.partidasFormArray.enable({ emitEvent: false });
          }

          if (sgcRes.totales) {
            this.totales = sgcRes.totales;
            this.subtotal = sgcRes.totales.subtotal;
            this.iva = sgcRes.totales.iva;
            this.total = sgcRes.totales.total;
          } else {
            this.calcularTotales();
          }
        } else {
          this.calcularTotales();
        }
      },
      error: (err) => {
        this._chatNotificationService.showError(
          "Opps",
          err?.error?.mensaje || "Hubo un error al cargar la cotización.",
          5000
        );
      },
    });
  }

  saveQuotes(): void {
    if (this.guardando) {
      return;
    }

    this.erroresGuardado = [];

    const formVal = this.quotesForm.value;
    const cotizacion: CotizacionSgcCabecera = {
      cotizacionProductosId: formVal.cotizacionProductosId || this.quotesId || 0,
      clienteId: formVal.clienteId || null,
      unidadDeNegocioId: formVal.unidadDeNegocioId || null,
      requisitosEspeciales: !!formVal.requisitosEspeciales,
      nombreCliente: formVal.nombreCliente || null,
      nombreEmpresa: formVal.nombreEmpresa || null,
      correo: formVal.correo || null,
      telefono: formVal.telefono || null,
      rfc: formVal.rfc || null,
      direccionCompleta: formVal.direccionCompleta || null,
      estado: formVal.estado || null,
      estatus: formVal.estatus || null,
      observaciones: formVal.observaciones || null,
    };

    const sgcVal = this.sgcForm.value;
    const sgc: CotizacionSgcDatos = {
      ...sgcVal,
      entregables: sgcVal.entregables || [],
    };

    // Siempre lo que hay en la tabla (aunque este vacia): nunca se reponen los detalles heredados de CONTPAQi
    const partidasEnviar: PartidaSgc[] =
      this.partidasFormArray && this.partidasFormArray.length > 0
        ? this.partidasFormArray.value
        : (this.partidas || []);

    const dto: GuardarCotizacionSgc = {
      cotizacion,
      sgc,
      partidas: partidasEnviar || [],
    };

    this.guardando = true;

    this.quotesService.guardarSgc(dto).subscribe({
      next: (res) => {
        this.guardando = false;
        const folio = res?.data?.folio || '';
        this._chatNotificationService.showSuccess(
          'Éxito',
          `Cotización ${folio} guardada correctamente`,
          3000
        );
        this.router.navigate(['/dashboards/quote-products']);
      },
      error: (err) => {
        this.guardando = false;
        if (err.status === 400 && err.error?.errores?.length > 0) {
          this.erroresGuardado = err.error.errores;
        } else {
          const msg = err.error?.mensaje || 'No se pudo guardar la cotización.';
          this.erroresGuardado = [msg];
          this._chatNotificationService.showError('Opps', msg, 5000);
        }
      },
    });
  }

  sincronizarPartidasFormArray(partidas: PartidaSgc[]): void {
    if (!this.partidasFormArray) {
      this.partidasFormArray = this.fb.array([]);
    }
    this.partidasFormArray.clear();
    for (const p of partidas) {
      this.partidasFormArray.push(
        this.fb.group({
          partida: [p.partida],
          tipoConcepto: [p.tipoConcepto || 'Material'],
          materialServicio: [p.materialServicio || '', Validators.required],
          descripcion: [p.descripcion || null],
          codigoProducto: [p.codigoProducto || null],
          productoId: [p.productoId || null],
          unidad: [p.unidad || 'PZA', Validators.required],
          cantidad: [p.cantidad ?? 1, [Validators.required, Validators.min(0.0001)]],
          precioUnitario: [p.precioUnitario ?? 0, [Validators.required, Validators.min(0)]],
          descuento: [p.descuento ?? 0, [Validators.min(0)]],
          costoUnitario: [p.costoUnitario ?? null],
          tiempoEntregaDias: [p.tiempoEntregaDias ?? null],
          notas: [p.notas || null],
          heredada: [p.heredada || false],
        })
      );
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
    this.prospectsService.getProspectos().subscribe((res: any) => {
      this.prospects = res.data;
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

  onClienteSelected(cliente: any): void {
    this.clientsService.getClientById(cliente).subscribe((data) => {
      if (data) {
        this.quotesForm.patchValue({
          direccionCompleta: data.direccion || "",
          nombreCliente: data.nombre || "",
          nombreEmpresa: data.empresa || "",
          correo: data.email || "",
          telefono: data.telefono || "",
          rfc: data.rfc || "",
          estado: data.estado || "",
          observaciones: data.observaciones || "",
        });

        // Forzar la detección de cambios
        this.cdr.detectChanges();
      }
    });
    // Forzar la detección de cambios
    this.cdr.detectChanges();
  }

  abrirModalCliente(event: MouseEvent): void {
    event.stopPropagation();

    const clienteId = this.quotesForm.get("clienteId")?.value;

    const dialogRef = this.dialog.open(AddClientComponent, {
      width: "600px",
      data: {
        clienteId: clienteId > 0 ? clienteId : null,
      },
    });

    dialogRef.afterClosed().subscribe((nuevoCliente) => {
      if (nuevoCliente) {
        // Si se ha creado un nuevo cliente, actualiza la lista de clientes
        this.getClientes();
        // Selecciona el nuevo cliente en el formulario
        this.quotesForm.get("cliente")?.setValue(nuevoCliente.clienteId);
        this.onClienteSelected(nuevoCliente.clienteId);
      }
    });
  }

  getUnidadesDeNegocio(): void {
    this.projectService
      .getUnidadesDeNegocio()
      .subscribe((data) => (this.unidadesDeNegocio = data));
  }

  clearClienteSeleccionado(): void {
    this.quotesForm.get("clienteId")?.setValue(null);
    this.selectedClienteId = null;
  }

  toggleEntregable(codigo: string, checked: boolean): void {
    const list: string[] = [...(this.sgcForm.get('entregables')?.value || [])];
    if (checked && !list.includes(codigo)) {
      list.push(codigo);
    } else if (!checked) {
      const idx = list.indexOf(codigo);
      if (idx >= 0) {
        list.splice(idx, 1);
      }
    }
    this.sgcForm.get('entregables')?.setValue(list);
    this.sgcForm.get('entregables')?.markAsDirty();
  }

  // Calcular subtotal, iva y total (siempre desde las partidas de la tabla)
  calcularTotales() {
    const list = this.partidasFormArray && this.partidasFormArray.length > 0
      ? this.partidasFormArray.value
      : (this.partidas || []);

    const tot = totalesSgc(
      list,
      this.sgcForm?.get("costosIndirectos")?.value,
      this.sgcForm?.get("margenAutorizadoPorcentaje")?.value
    );
    this.totales = tot;
    this.subtotal = tot.subtotal;
    this.iva = tot.iva;
    this.total = tot.total;
  }

  openCotizacionPreview(): void {
    // Lo que se ve en el formulario (aunque aun no se guarde); una cotizacion nueva no tiene datos cargados
    const cotizacion = {
      ...(this.cotizacion ?? {}),
      ...this.quotesForm.value,
      cotizacionProductosId: this.quotesId ?? this.quotesForm.value.cotizacionProductosId ?? null,
      subtotal: this.subtotal,
      iva: this.iva,
      total: this.total,
    };

    const partidasList = this.partidasFormArray && this.partidasFormArray.length > 0
      ? this.partidasFormArray.value
      : (this.partidas || []);

    this.dialog.open(QuotePdfDialogComponent, {
      data: {
        cotizacion,
        sgc: { ...this.sgcForm?.value, folio: this.folio, version: this.version },
        partidas: partidasList,
        totales: this.totales,
      },
      width: "820px", // un poco más que 794px para márgenes
      panelClass: "dialog-a4",
    });
  }
  getEstatus(): void {
    this.quotesService.getEstatus().subscribe((data) => (this.estatus = data.data));
  }
}
