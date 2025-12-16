import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatTableDataSource } from '@angular/material/table';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { LoginLogsService } from '../login-logs.service';
import Swal from "sweetalert2";

@Component({
    selector: 'app-login-table',
    standalone: true,
    templateUrl: './login-table.component.html',
    styleUrls: ['./login-table.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatPaginatorModule,
        MatSortModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule
    ]
})
export class LoginTableComponent implements OnInit {

    displayedColumns: string[] = [
        'usuario',
        'fecha',
        'navegador',
        'dispositivo',
        'ubicacion',
        'estado'
    ];

    dataSource = new MatTableDataSource<any>([]);
    logsCount = 0;

    /** Filtros */
    textoBusqueda = '';
    usuarioSeleccionado = '';
    usuarios: any[] = [];

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(private loginLogsService: LoginLogsService) { }

    ngOnInit(): void {
        this.getLogs();

        /** 🔑 Filtro combinado */
        this.dataSource.filterPredicate = (data, filter) => {
            const criteria = JSON.parse(filter);

            const matchTexto =
                !criteria.texto ||
                data.nombreUsuario?.toLowerCase().includes(criteria.texto) ||
                data.ip?.toLowerCase().includes(criteria.texto);

            const matchUsuario =
                !criteria.usuario ||
                data.nombreUsuario === criteria.usuario;

            return matchTexto && matchUsuario;
        };
    }

    getLogs(): void {
        this.loginLogsService.getLogs().subscribe({
            next: (logs) => {
                this.dataSource.data = logs;
                this.logsCount = logs.length;

                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;

                /** Usuarios únicos */
                this.usuarios = [
                    ...new Set(
                        logs
                            .map(l => l.nombreUsuario)
                            .filter((u): u is string => !!u)
                    )
                ];
            },
            error: (error) => {
                console.warn('Error al obtener los logs de login.');
            }
        });
    }

    /** 🔍 Búsqueda por texto */
    applyFilter(event: Event): void {
        this.textoBusqueda = (event.target as HTMLInputElement).value
            .trim()
            .toLowerCase();

        this.applyCombinedFilter();
    }

    /** 👤 Cambio de usuario */
    onUsuarioChange(usuario: string): void {
        this.usuarioSeleccionado = usuario;
        this.applyCombinedFilter();
    }

    /** 🔄 Aplica filtros combinados */
    private applyCombinedFilter(): void {
        this.dataSource.filter = JSON.stringify({
            texto: this.textoBusqueda,
            usuario: this.usuarioSeleccionado,
            _ts: Date.now() // 🔑 fuerza reevaluación
        });

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }

        this.logsCount = this.dataSource.filteredData.length;
    }
}
