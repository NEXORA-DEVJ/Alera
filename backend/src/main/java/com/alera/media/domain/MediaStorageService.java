package com.alera.media.domain;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
public class MediaStorageService {

    private static final Logger log = LoggerFactory.getLogger(MediaStorageService.class);
    private final Path storageDirectory;

    public MediaStorageService(@Value("${alera.storage.upload-dir:./uploads/incidents}") String uploadDir) {
        this.storageDirectory = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageDirectory);
            log.info("Directorio de almacenamiento de imágenes inicializado: {}", this.storageDirectory);
        } catch (IOException e) {
            log.error("No fue posible inicializar el directorio de almacenamiento de imágenes: {}", e.getMessage());
            throw new RuntimeException("Fallo al inicializar directorio de almacenamiento", e);
        }
    }

    /**
     * Almacena un archivo binario subido mediante MultipartFile.
     * Retorna el nombre único asignado al archivo.
     */
    public String store(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("No se puede almacenar un archivo vacío");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        String uniqueFilename = "inc_" + UUID.randomUUID().toString().replace("-", "") + extension;

        Path targetLocation = this.storageDirectory.resolve(uniqueFilename);
        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
        }

        log.info("Imagen multipart almacenada: {} ({} KB)", uniqueFilename, file.getSize() / 1024);
        return uniqueFilename;
    }

    /**
     * Almacena una imagen proveniente de cadena Base64 (Data URI o Base64 pura).
     * Retorna el nombre único asignado al archivo.
     */
    public String storeBase64(String base64Data) throws IOException {
        if (base64Data == null || base64Data.isBlank()) {
            throw new IllegalArgumentException("Cadena Base64 vacía");
        }

        String pureBase64 = base64Data;
        String extension = ".jpg";

        if (base64Data.contains(",")) {
            String[] parts = base64Data.split(",", 2);
            String metadata = parts[0];
            pureBase64 = parts[1];

            if (metadata.contains("image/png")) {
                extension = ".png";
            } else if (metadata.contains("image/webp")) {
                extension = ".webp";
            }
        }

        byte[] decodedBytes = Base64.getDecoder().decode(pureBase64.trim());
        String uniqueFilename = "inc_" + UUID.randomUUID().toString().replace("-", "") + extension;

        Path targetLocation = this.storageDirectory.resolve(uniqueFilename);
        try (InputStream inputStream = new ByteArrayInputStream(decodedBytes)) {
            Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
        }

        log.info("Imagen Base64 convertida y almacenada en disco: {} ({} KB)", uniqueFilename, decodedBytes.length / 1024);
        return uniqueFilename;
    }

    private static final List<String> ALLOWED_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".webp");

    /**
     * Carga un archivo como Recurso de Spring para ser transmitido por HTTP.
     * Incluye validación estricta contra ataques de Path Traversal (CWE-22).
     */
    public Resource loadAsResource(String filename) {
        try {
            Path filePath = this.storageDirectory.resolve(filename).normalize();
            if (!filePath.startsWith(this.storageDirectory)) {
                log.warn("ALERTA DE SEGURIDAD: Intento de Path Traversal bloqueado para archivo: {}", filename);
                throw new SecurityException("Acceso no autorizado al sistema de archivos.");
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                return null;
            }
        } catch (MalformedURLException e) {
            log.warn("Ruta de archivo malformada: {}", filename);
            return null;
        }
    }

    private String getFileExtension(String filename) {
        if (filename != null && filename.contains(".")) {
            String ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
            if (ALLOWED_EXTENSIONS.contains(ext)) {
                return ext;
            }
        }
        return ".jpg";
    }
}
