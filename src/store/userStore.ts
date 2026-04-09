import { jwtDecode } from 'jwt-decode';

interface Usuario {
  id: number;
  username: string;
  role: string;
}

//null al inicio
let usuario: Usuario | null = null; 

//obbtenosmos la info del usuario contenida en el token
const token = localStorage.getItem('token');
if (token) {
  const payload: any = jwtDecode(token);
  usuario = {
    id: payload.id,
    username: payload.sub,
    role: payload.role
  };
  console.log(usuario);
}

export const userStore = {
  usuario,
  setUsuario(newUsuario: Usuario) {
    usuario = newUsuario;
  }
};