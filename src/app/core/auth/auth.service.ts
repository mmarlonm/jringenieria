import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { AuthUtils } from "app/core/auth/auth.utils";
import { UserService } from "app/core/user/user.service";
import { environment } from "environments/environment";
import { Observable, of, switchMap, throwError, from } from "rxjs";
import { PresenceService } from "app/presence.service";

@Injectable({ providedIn: "root" })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/Auth`;
  private _authenticated: boolean = false;
  private _httpClient = inject(HttpClient);
  private _userService = inject(UserService);
  private _presenceService = inject(PresenceService);

  private tokenWatcherInterval: any;

  // Access token
  set accessToken(token: string) {
    localStorage.setItem("accessToken", token);
  }

  get accessToken(): string {
    return localStorage.getItem("accessToken") ?? "";
  }

  // User info
  set userInformation(usr: string) {
    localStorage.setItem("userInformation", usr);
  }

  get userInformation(): any {
    return localStorage.getItem("userInformation") ?? "";
  }

  // -----------------------------------
  // Métodos públicos
  // -----------------------------------

  forgotPassword(email: string): Observable<any> {
    return this._httpClient.post("api/auth/forgot-password", email);
  }

  resetPassword(password: string): Observable<any> {
    return this._httpClient.post("api/auth/reset-password", password);
  }

  signIn(credentials: { username: string; password: string }): Observable<any> {
    if (this._authenticated) {
      return throwError(() => new Error("User is already logged in."));
    }

    return from(this.obtenerMetadataCompleta()).pipe(
      switchMap(metadata => {
        const body = { ...credentials, metadata };

        return this._httpClient.post(`${this.apiUrl}/login`, body).pipe(
          switchMap((response: any) => {
            this.accessToken = response.token;
            this._authenticated = true;

            const { token, ...userWithoutToken } = response;
            this.userInformation = JSON.stringify(userWithoutToken);
            this._userService.user = response;
            this._presenceService.startConnection(response.token, response.usuario.id);

            this.startTokenWatcher(); // ⬅️ Inicia verificación periódica del token

            return of(response);
          })
        );
      })
    );
  }

  signOut(): Observable<any> {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userInformation");
    this._authenticated = false;

    this._presenceService.stopConnection();
    this.stopTokenWatcher(); // ⬅️ Detiene el watcher

    return of(true);
  }

  signUp(user: { name: string; email: string; password: string; company: string }): Observable<any> {
    return this._httpClient.post("api/auth/sign-up", user);
  }

  unlockSession(credentials: { email: string; password: string }): Observable<any> {
    return this._httpClient.post("api/auth/unlock-session", credentials);
  }

  check(): Observable<boolean> {
    if (this._authenticated) return of(true);
    if (!this.accessToken || AuthUtils.isTokenExpired(this.accessToken)) return of(false);

    const user: any = JSON.parse(this.userInformation);
    this._userService.user = user;

    return of(true);
  }

  // -----------------------------------
  // Token Watcher
  // -----------------------------------

  startTokenWatcher(): void {
    if (this.tokenWatcherInterval) {
      clearInterval(this.tokenWatcherInterval);
    }

    this.tokenWatcherInterval = setInterval(() => {
      const token = this.accessToken;
      if (token && AuthUtils.isTokenExpired(token)) {
        console.warn("🔒 Token expirado. Cerrando sesión automáticamente...");
        this.signOut().subscribe(() => {
          location.reload(); // o router.navigate(['/sign-in']);
        });
      }
    }, 30 * 1000); // Cada 30 segundos
  }

  stopTokenWatcher(): void {
    if (this.tokenWatcherInterval) {
      clearInterval(this.tokenWatcherInterval);
      this.tokenWatcherInterval = null;
    }
  }

  // -----------------------------------
  // Métodos auxiliares
  // -----------------------------------

  obtenerMetadataCompleta(): Promise<any> {
    const userAgent = navigator.userAgent;

    const navegador = (() => {
      if (userAgent.includes("Chrome")) return "Chrome";
      if (userAgent.includes("Firefox")) return "Firefox";
      if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
      if (userAgent.includes("Edge")) return "Edge";
      return "Desconocido";
    })();

    const sistemaOperativo = (() => {
      if (userAgent.includes("Windows")) return "Windows";
      if (userAgent.includes("Mac")) return "MacOS";
      if (userAgent.includes("Linux")) return "Linux";
      if (userAgent.includes("Android")) return "Android";
      if (userAgent.includes("iPhone")) return "iOS";
      return "Desconocido";
    })();

    const dispositivo = /Mobi|Android/i.test(userAgent) ? "Móvil" : "Escritorio";

    const ipPromise = fetch("https://api.ipify.org?format=json")
      .then(res => res.json())
      .then(data => data.ip)
      .catch(() => "Desconocida");

    const ubicacionPromise = this.obtenerUbicacionPorIP();

    return Promise.all([ipPromise, ubicacionPromise]).then(([ip, ubicacion]) => ({
      Ip: ip,
      Navegador: navegador,
      SistemaOperativo: sistemaOperativo,
      Dispositivo: dispositivo,
      Ubicacion: ubicacion,
    }));
  }

  async obtenerUbicacionPorIP(): Promise<string> {
    try {
      const response = await fetch("https://ipapi.co/json/");
      const data = await response.json();
      return `${data.city}, ${data.region}, ${data.country_name}`;
    } catch (error) {
      console.error("Error obteniendo ubicación por IP:", error);
      return "Ubicación desconocida";
    }
  }
}