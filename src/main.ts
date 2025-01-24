import './style.css'
import { E } from "./E";

type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

class InstOcupaNumero extends Error {
  constructor(instruccion: string) {
    super("Se esperaba un numero con la instruccion `" + instruccion + "`");
  }
}
class InstEsperaNumerosEnPila extends Error {
  constructor(instruccion: string, cantidad: number) {
    super(cantidad == 1 ? `Se esperaba un numero en la pila para la instruccion \`${instruccion}\`` : `Se esperaban ${cantidad} numeros en la pila para la instruccion \`${instruccion}\``);
  }
}
class InstOcupaNombre extends Error {
  constructor(instruccion: string) {
    super("Se esperaba un nombre con la instruccion `" + instruccion + "`");
  }
}
class NombreInvalido extends Error {
  constructor(instruccion: string, nombre: string) {
    super("El nombre, " + nombre + ", dado a la instruccion `" + instruccion + "` es invalido. Un nombre solo puede empezar con letras sin acento o un _");
  }
}

class NombreNoExistEnMemoria extends Error {
  constructor(instruccion: string, nombre: string) {
    super("El nombre, " + nombre + ", dado a la instruccion `" + instruccion + "` no existe. Se esperaba un nombre guardado en memoria");
  }
}

function requiereUnNumero(instruccion: string, pila: number[]): number {
  const x = pila.pop();
  if (x == null) {
    throw new InstEsperaNumerosEnPila(instruccion, 1);
  }
  return x;
}

function requiereDosNumeros(instruccion: string, pila: number[]): [number, number] {
  const y = pila.pop();
  const x = pila.pop();
  if (x == null || y == null) {
    throw new InstEsperaNumerosEnPila(instruccion, 2);
  }
  return [x, y];
}

function ejecutarCodigo(code: string): Result<string, string> {
  const tokens: string[] & { peek(): string | undefined; } = code.split(/\s+/).map(x => x.trim()).filter(x => x) as any;
  if (tokens.length == 0) return { ok: true, value: "<Programa Vacio>", };
  tokens.peek = () => tokens[0];

  const inicioNombreRegex = /^[a-z_]/i;
  const memoria: Record<string, number> = {};
  const pila: number[] & { peek(): number | undefined; } = [] as any;
  pila.peek = () => pila[pila.length - 1];
  while (tokens.length > 0) {
    const tok = tokens.shift()!;
    switch (tok) {
      case "empujar":
      case "push":
        try {
          const nextToken = tokens.peek();
          if (!nextToken) {
            throw new InstOcupaNumero(tok);
          }
          const num = Number(nextToken);
          if (Number.isNaN(num)) {
            throw new InstOcupaNumero(tok);
          }
          tokens.shift()!;
          pila.push(num);
        } catch (e) {
          // console.log("Tokens:", tokens);
          return { ok: false, error: (e as Error).message };
        }
        break;

      case "sumar":
      case "add":
        try {
          const [x, y] = requiereDosNumeros(tok, pila);
          pila.push(x + y);
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
        break;

      case "restar":
      case "subtract":
        try {
          const [x, y] = requiereDosNumeros(tok, pila);
          pila.push(x - y);
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
        break;

      case "multiplicar":
      case "multiply":
        try {
          const [x, y] = requiereDosNumeros(tok, pila);
          pila.push(x * y);
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
        break;

      case "dividir":
      case "divide":
        try {
          const [x, y] = requiereDosNumeros(tok, pila);
          pila.push(x / y);
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
        break;

      case "guardar":
      case "store":
        try {
          const nombre = tokens.peek();
          if (!nombre) {
            throw new InstOcupaNombre(tok);
          }
          if (!inicioNombreRegex.test(nombre)) {
            throw new NombreInvalido(tok, nombre);
          }
          const x = requiereUnNumero(tok, pila);
          tokens.shift()!;
          memoria[nombre] = x;
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
        break;

      case "cargar":
      case "load":
        try {
          const nombre = tokens.peek();
          if (!nombre) {
            throw new InstOcupaNombre(tok);
          }
          if (!(nombre in memoria)) {
            throw new NombreNoExistEnMemoria(tok, nombre);
          }
          tokens.shift()!;
          const x = memoria[nombre];
          pila.push(x);
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
        break;

      default:
        // console.log("Tokens:", tokens);
        return { ok: false, error: "Instruccion desconocida: `" + tok + "`" };
    }
  }
  let resultado = "Pila: [ ";
  for (let i = pila.length - 1; i >= 0; --i) {
    if (i < pila.length - 1) {
      resultado += ", ";
    }
    resultado += pila[i];
  }
  resultado += " ]\n";
  resultado += "Memoria: {";
  for (const [key, val] of Object.entries(memoria)) {
    resultado += ` ${key}: ${val},`;
  }
  resultado += " }";
  return { ok: true, value: resultado };
}

function App() {
  const codigoAnterior = localStorage.getItem("zotnivi.code") ?? "empujar 34\nempujar 35\nsumar\nguardar X";
  const pRes = E<HTMLParagraphElement>("p");
  const ejecutarEImprimirResultado = (codigo: string) => {
    const resultado = ejecutarCodigo(codigo);
    if (resultado.ok) {
      pRes.innerText = "OK!\n\t" + resultado.value;
      return;
    }
    pRes.innerText = "Error: " + resultado.error;
  };
  const inpCodigo = E<HTMLTextAreaElement>("textarea", {
    classes: "resize-none p-2",
    rows: 20,
    onInput() {
      const codigo = inpCodigo.value;
      localStorage.setItem("zotnivi.code", codigo);
      ejecutarEImprimirResultado(codigo);
    },
  });
  inpCodigo.value = codigoAnterior;
  ejecutarEImprimirResultado(codigoAnterior);
  E("#app", {
    classes: "p-4 grid grid-cols-2 gap-4",
    children: [
      E("label", {
        classes: "flex flex-col",
        children: [
          "Codigo:",
          inpCodigo,
        ]
      }),
      pRes,
    ],
  });
}

App();

