import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, of } from 'rxjs';
import { switchMap, catchError, startWith } from 'rxjs/operators';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ServerStatusService {
  private serverStatusSubject = new BehaviorSubject<boolean>(true);
  public serverStatus$ = this.serverStatusSubject.asObservable();

  constructor(private http: HttpClient) {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    interval(30000) // Verificar cada 30 segundos
      .pipe(
        startWith(0),
        switchMap(() =>
          this.checkServerStatus().pipe(
            catchError(() => {
              this.serverStatusSubject.next(false);
              return of(null);
            })
          )
        )
      )
      .subscribe((res) => {
        if (res !== null) {
          this.serverStatusSubject.next(true);
        }
      });
  }

  private checkServerStatus(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/health`, {
      responseType: 'text'
    });
  }
}
