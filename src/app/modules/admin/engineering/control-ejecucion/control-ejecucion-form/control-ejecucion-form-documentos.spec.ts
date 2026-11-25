import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlEjecucionFormComponent } from './control-ejecucion-form.component';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { EngineeringService } from '../../engineering.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { SubcontratacionService } from '../../subcontratacion.service';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import { VisorDocumentoDialogComponent } from '../visor-documento-dialog/visor-documento-dialog.component';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';
import { OnlyOfficeEditorComponent } from '@fuse/components/only-office-editor/only-office-editor.component';

describe('ControlEjecucionFormComponent - Ver y Editar Documentos', () => {
    let component: ControlEjecucionFormComponent;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let engineeringSpy: jasmine.SpyObj<EngineeringService>;

    beforeEach(() => {
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        engineeringSpy = jasmine.createSpyObj('EngineeringService', ['descargarArchivoEjecucion', 'getToken']);

        const activatedRouteMock = {
            snapshot: { paramMap: { get: () => '10' } }
        };
        const routerMock = jasmine.createSpyObj('Router', ['navigate']);
        const usersSpy = jasmine.createSpyObj('UsersService', ['getUsers']);
        const subcontratacionSpy = jasmine.createSpyObj('SubcontratacionService', ['getPersonal', 'getEquiposDisponibles']);
        const cdrMock = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges', 'markForCheck']);

        component = new ControlEjecucionFormComponent(
            activatedRouteMock as any,
            routerMock as any,
            new FormBuilder(),
            dialogSpy,
            engineeringSpy,
            usersSpy,
            subcontratacionSpy,
            cdrMock
        );
        component.idSeguimiento = 10;

        spyOn(localStorage, 'getItem').and.callFake((key: string) => {
            if (key === 'userInformation') {
                return JSON.stringify({ usuario: { id: 42 } });
            }
            return null;
        });
    });

    describe('previsualizarArchivo (Ver)', () => {
        it('un_archivo_docx_pide_el_blob_y_abre_VisorDocumentoDialogComponent', () => {
            const base64Data = btoa('contenido-docx-simulado');
            engineeringSpy.descargarArchivoEjecucion.and.returnValue(of({
                data: base64Data,
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }));

            const file = { tipo: 'Ingeniería', nombreArchivo: 'calculos.docx' };
            component.previsualizarArchivo(file);

            expect(engineeringSpy.descargarArchivoEjecucion).toHaveBeenCalledWith(10, 'Ingeniería', 'calculos.docx');
            expect(dialogSpy.open).toHaveBeenCalledWith(
                VisorDocumentoDialogComponent,
                jasmine.objectContaining({
                    data: jasmine.objectContaining({
                        nombreArchivo: 'calculos.docx',
                        blob: jasmine.any(Blob)
                    })
                })
            );
        });

        it('un_archivo_doc_viejo_abre_VisorDocumentoDialogComponent_con_formatoNoSoportado_sin_pedir_descarga', () => {
            const file = { tipo: 'Ingeniería', nombreArchivo: 'documento_viejo.doc' };
            component.previsualizarArchivo(file);

            expect(engineeringSpy.descargarArchivoEjecucion).not.toHaveBeenCalled();
            expect(dialogSpy.open).toHaveBeenCalledWith(
                VisorDocumentoDialogComponent,
                jasmine.objectContaining({
                    data: jasmine.objectContaining({
                        nombreArchivo: 'documento_viejo.doc',
                        formatoNoSoportado: true
                    })
                })
            );
        });

        it('imagenes_y_PDF_siguen_usando_ImagePreviewDialogComponent', () => {
            const base64Pdf = btoa('pdf-content');
            engineeringSpy.descargarArchivoEjecucion.and.returnValue(of({
                data: base64Pdf,
                contentType: 'application/pdf'
            }));

            const pdfFile = { tipo: 'Planos', nombreArchivo: 'diagrama.pdf' };
            component.previsualizarArchivo(pdfFile);

            expect(dialogSpy.open).toHaveBeenCalledWith(
                ImagePreviewDialogComponent,
                jasmine.objectContaining({
                    data: jasmine.objectContaining({
                        name: 'diagrama.pdf',
                        isPdf: true
                    })
                })
            );

            dialogSpy.open.calls.reset();

            const imgFile = { tipo: 'Fotos', nombreArchivo: 'foto.jpg' };
            component.previsualizarArchivo(imgFile);

            expect(dialogSpy.open).toHaveBeenCalledWith(
                ImagePreviewDialogComponent,
                jasmine.objectContaining({
                    data: jasmine.objectContaining({
                        name: 'foto.jpg',
                        isPdf: false
                    })
                })
            );
        });

        it('si_la_descarga_para_docx_falla_abre_el_visor_con_errorCarga_para_ofrecer_descargar', () => {
            engineeringSpy.descargarArchivoEjecucion.and.returnValue(throwError(() => new Error('Error de red')));

            const file = { tipo: 'Ingeniería', nombreArchivo: 'falla.docx' };
            component.previsualizarArchivo(file);

            expect(dialogSpy.open).toHaveBeenCalledWith(
                VisorDocumentoDialogComponent,
                jasmine.objectContaining({
                    data: jasmine.objectContaining({
                        nombreArchivo: 'falla.docx',
                        errorCarga: true
                    })
                })
            );
        });
    });

    describe('editarDocumento (Editar)', () => {
        it('usa_la_configuracion_firmada_del_token_y_pasa_onDescargar_a_OnlyOfficeEditorComponent', () => {
            const signedConfig = {
                document: {
                    title: 'memoria.docx',
                    url: 'http://api.jr.com/editfile?exp=123&firma=abc'
                },
                editorConfig: {
                    callbackUrl: 'http://api.jr.com/callback?exp=123&firma=abc'
                }
            };
            engineeringSpy.getToken.and.returnValue(of({
                token: 'jwt-firmado-123',
                config: signedConfig
            }));

            const archivo = { id: 1, tipo: 'Ingeniería', nombreArchivo: 'memoria.docx' };
            component.editarDocumento(archivo, 'docx');

            expect(engineeringSpy.getToken).toHaveBeenCalledWith(10, 'Ingeniería', 'memoria.docx');
            expect(dialogSpy.open).toHaveBeenCalledWith(
                OnlyOfficeEditorComponent,
                jasmine.objectContaining({
                    data: jasmine.objectContaining({
                        editorConfig: jasmine.objectContaining({
                            token: 'jwt-firmado-123',
                            document: signedConfig.document
                        }),
                        archivo: archivo,
                        onDescargar: jasmine.any(Function)
                    })
                })
            );
        });
    });
});
