import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-qr-preview-dialog',
    templateUrl: './qr-preview-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatDialogModule,
        MatIconModule
    ]
})
export class QrPreviewDialogComponent implements OnInit {
    personal: any;
    publicUrl: string = '';
    qrCodeUrl: string = '';

    constructor(
        private _dialogRef: MatDialogRef<QrPreviewDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) { }

    ngOnInit(): void {
        this.personal = this.data.personal;
        let baseHref = document.getElementsByTagName('base')[0]?.getAttribute('href') || '/';
        if (!baseHref.endsWith('/')) {
            baseHref += '/';
        }
        this.publicUrl = window.location.origin + baseHref + '#/eventos/ficha-personal/' + this.personal.tokenQr;
        this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(this.publicUrl)}`;
    }

    printQr(): void {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir Código QR - ${this.personal.nombreCompleto}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            text-align: center;
                        }
                        .container {
                            border: 2px dashed #ccc;
                            padding: 30px;
                            border-radius: 15px;
                            max-width: 400px;
                        }
                        h2 {
                            margin: 0 0 5px 0;
                            color: #333;
                        }
                        p {
                            margin: 5px 0;
                            color: #666;
                            font-size: 14px;
                        }
                        img {
                            margin: 20px 0;
                            width: 250px;
                            height: 250px;
                        }
                        .badge {
                            background-color: #4f46e5;
                            color: white;
                            padding: 5px 12px;
                            border-radius: 20px;
                            font-size: 12px;
                            font-weight: bold;
                            text-transform: uppercase;
                            display: inline-block;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <span class="badge">${this.personal.tipoPersonal}</span>
                        <h2 style="margin-top: 15px;">${this.personal.nombreCompleto}</h2>
                        <p>${this.personal.cargo} en <strong>${this.personal.empresa}</strong></p>
                        <img src="${this.qrCodeUrl}" alt="Código QR">
                        <p style="font-size: 10px; color: #999;">Escanea para ver la información de contacto</p>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    close(): void {
        this._dialogRef.close();
    }
}
