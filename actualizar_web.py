import os
import paramiko

def upload_directory(sftp, local_dir, remote_dir):
    """Sube recursivamente un directorio a un servidor SFTP."""
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = os.path.join(remote_dir, item).replace('\\', '/')
        
        if os.path.isdir(local_path):
            try:
                sftp.stat(remote_path)  # Verifica si el directorio existe en el servidor remoto
            except FileNotFoundError:
                sftp.mkdir(remote_path)  # Crea el directorio si no existe
            upload_directory(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)  # Sobrescribe el archivo si existe, o lo crea si no

def sftp_upload(hostname, port, username, password, local_dir, remote_dir):
    """Sube un directorio a un servidor remoto SFTP."""
    try:
        # Crear un cliente SSH
        ssh = paramiko.SSHClient()
        # Aceptar automáticamente los certificados SSH desconocidos
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        # Conexión al servidor SFTP
        ssh.connect(hostname, port=port, username=username, password=password)
        sftp = ssh.open_sftp()
        # Crear la carpeta remota si no existe
        try:
            sftp.stat(remote_dir)
        except FileNotFoundError:
            sftp.mkdir(remote_dir)
        # Subir la carpeta local al servidor
        upload_directory(sftp, local_dir, remote_dir)
        print(f"La carpeta {local_dir} ha sido subida a {hostname}:{remote_dir} exitosamente.")
    except Exception as e:
        print(f"Error durante la transferencia: {e}")
    finally:
        sftp.close()
        ssh.close()

# Configuración de la conexión
hostname = 'home484808560.1and1-data.host'  # Cambia esto por la IP o dominio de tu servidor
port = 22  # El puerto por defecto de SFTP es 22
# username = 'u74332895'  # Nombre de usuario
# password = 'Pr0Murc14#10.06.24'  # Contraseña
base_dir = os.path.dirname(os.path.abspath(__file__))
local_dir = os.path.join(base_dir, '../tasacion-inmobiliaria')  # Ruta local al web_2
remote_dir = 'tasacion-inmobiliaria'  # Ruta remota en el servidor

# # Ejecutar la subida
# sftp_upload(hostname, port, username, password, local_dir, remote_dir)
# local_dir = os.path.join(base_dir, '../security')  # Ruta local al security
# remote_dir = 'security'  # Ruta remota en el servidor
# sftp_upload(hostname, port, username, password, local_dir, remote_dir)