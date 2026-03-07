import { Component, OnInit, ViewChild, AfterViewInit } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { SurveysService } from "../surveys.service";
import { MatTableDataSource } from "@angular/material/table";
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatMenuTrigger } from "@angular/material/menu"; // Importa MatMenuTrigger
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatMenuModule } from "@angular/material/menu";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTableModule } from "@angular/material/table";
import { MatSelectModule } from "@angular/material/select";
import { MatDialog } from "@angular/material/dialog";
import { reverse } from "lodash";
import Swal from "sweetalert2";
import { SurveysComponent } from '../survey-dialog/survey-dialog.component';

@Component({
    selector: "app-surveys-list",
    templateUrl: "./surveys-list.component.html",
    styleUrls: ["./surveys-list.component.scss"],
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatPaginator,
        MatSort,
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        MatMenuModule,
        MatSelectModule,
    ],
})
export class SurveysListComponent implements OnInit, AfterViewInit {
    displayedColumns: string[] = [
        "id",
        "nombre",
        "proyectoNombre",
        "email",
        "fechaRegistro",
        "actions",
    ];
    dataSource = new MatTableDataSource<any>();
    surveysCount: number = 0;
    searchText: string = "";
    permisosUsuario: any[] = [];
    vistaActual: string = "";
    permisosDisponibles: string[] = [];
    filterValue: string = "";

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    @ViewChild(MatMenuTrigger) menuTrigger: MatMenuTrigger; // Añadir la referencia a MatMenuTrigger

    constructor(
        private surveysService: SurveysService,
        private router: Router,
        private _chatNotificationService: ChatNotificationService,
        private route: ActivatedRoute,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.getProjects();
        this.obtenerPermisos();
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.dataSource.sort = this.sort;
            this.dataSource.paginator = this.paginator;
        }, 1200);
    }

    getProjects(): void {
        this.surveysService.getSurveys().subscribe((surveys: any) => {
            if (surveys.code == 200) {
                this.surveysCount = surveys.data.length;
                this.dataSource = new MatTableDataSource(surveys.data);
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;
            } else {
                this._chatNotificationService.showError(
                    "Error",
                    "Hubo un error en el sistema, contacte al administrador del sistema.",
                    5000
                );
            }
        });
    }

    obtenerPermisos(): void {
        const userInformation = localStorage.getItem("userInformation");
        if (!userInformation) {
            return;
        }

        const userData = JSON.parse(userInformation);
        this.permisosUsuario = userData.permisos.filter(
            (permiso) => permiso.vista.ruta === `${this.vistaActual}`
        );

        this.permisosDisponibles = this.permisosUsuario.map(
            (permiso) => permiso.codigo
        );
    }

    tienePermiso(codigo: string): boolean {
        return this.permisosDisponibles.includes(codigo);
    }

    /**
     * Aplica el filtro correspondiente basado en el tipo de columna.
     */
    applyFilter(): void {
        this.dataSource.filter = this.filterValue.trim().toLowerCase(); // Se usa como input del predicate
    }
    openSurveyDialog(id: number): void {
        this.surveysService.getSurveyById(id).subscribe((res) => {
            if (res.code === 200) {
                this.dialog.open(SurveysComponent, {
                    width: '600px',
                    data: res.data
                });
            } else {
                // Muestra error si no se encontró
                this._chatNotificationService.showError('Error', 'Encuesta no encontrada', 5000);
            }
        });
    }


}
