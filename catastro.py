import requests
import json
import unicodedata
import re
import sys

def normalizar_texto(texto):
    texto = texto.upper()
    texto = unicodedata.normalize('NFKD', texto).encode('ASCII', 'ignore').decode('utf-8')
    texto = re.sub(r'[^A-Z0-9 ]', '', texto)
    return re.sub(r'\s+', ' ', texto).strip()

def obtener_inmuebles(provincia, municipio, sigla, via, numero):
    print(f"🌐 Consultando Catastro para:")
    print(f"   Provincia: {provincia}")
    print(f"   Municipio: {municipio}")
    print(f"   Sigla de vía: {sigla}")
    print(f"   Calle: {via}")
    print(f"   Número: {numero}")
    
    url = (
        "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/"
        f"Consulta_DNPLOC?Provincia={provincia}&Municipio={municipio}"
        f"&Sigla={sigla}&Calle={via}&Numero={numero}"
    )
    headers = {"User-Agent": "PromurciaBot"}
    resp = requests.get(url, headers=headers)

    print("🔄 Conectando con la API del Catastro...")
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al consultar Catastro.")

    print("✅ Respuesta recibida. Procesando datos...")
    data = resp.json()
    return data.get("consulta_dnplocResult", {}).get("lrcdnp", {}).get("rcdnp", [])

def obtener_refcat_unida(rc):
    if isinstance(rc, str):
        return rc
    return (
        rc.get('pc1', '') +
        rc.get('pc2', '') +
        rc.get('car', '') +
        rc.get('cc1', '') +
        rc.get('cc2', '')
    )

def completar_datos_con_dnprc(refcat):
    url = f"https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNPRC?RefCat={refcat}"
    headers = {"User-Agent": "PromurciaBot"}
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        return {}
    data = resp.json()
    inmuebles = data.get("consulta_dnprcResult", {}).get("lrcdnp", {}).get("rcdnp", [])
    if not inmuebles:
        return {}
    info = {}
    lcons = inmuebles[0].get("dt", {}).get("lcons", {})
    info.update({
        "bloque": lcons.get("blo", ""),
        "escalera": lcons.get("esc", ""),
        "planta": lcons.get("pto", ""),
        "puerta": lcons.get("puerta", "")
    })
    debi = inmuebles[0].get("debi", {})
    info.update({
        "uso": debi.get("luso", ""),
        "superficie": debi.get("sfc", ""),
        "anio": debi.get("ant", ""),
        "clase": debi.get("ucl", "")
    })
    return info

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("❌ Uso incorrecto.")
        print("Uso:")
        print("python3 fusion_catastro.py 'Calle' numero sigla")
        sys.exit(1)

    provincia = "MURCIA"
    municipio = "MURCIA"
    via = normalizar_texto(sys.argv[1])
    numero = sys.argv[2]
    sigla = sys.argv[3].upper()

    try:
        inmuebles = obtener_inmuebles(provincia, municipio, sigla, via, numero)

        if not inmuebles:
            print("❌ No se encontraron inmuebles en ese portal.")
            sys.exit(0)

        print(f"📦 Inmuebles encontrados: {len(inmuebles)}")

        resultado_final = []
        for v in inmuebles:
            refcat = obtener_refcat_unida(v.get("rc"))
            original = v.get("dt", {}).get("lcons", {})
            ref_detalle = completar_datos_con_dnprc(refcat)

            resultado_final.append({
                "refcat": refcat,
                "bloque": original.get("blo", "") or ref_detalle.get("bloque", ""),
                "escalera": original.get("esc", "") or ref_detalle.get("escalera", ""),
                "planta": original.get("pto", "") or ref_detalle.get("planta", ""),
                "puerta": original.get("puerta", "") or ref_detalle.get("puerta", ""),
                "uso": ref_detalle.get("uso", ""),
                "superficie": ref_detalle.get("superficie", ""),
                "anio": ref_detalle.get("anio", ""),
                "clase": ref_detalle.get("clase", "")
            })

        print(json.dumps(resultado_final, ensure_ascii=False, indent=2))

    except Exception as e:
        print(f"❌ Error: {str(e)}")
