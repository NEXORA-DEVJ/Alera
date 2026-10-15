package com.alera.media.infrastructure.rest;

import com.alera.media.domain.MediaStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/media")
public class MediaController {

    private static final Logger log = LoggerFactory.getLogger(MediaController.class);
    private final MediaStorageService storageService;

    public MediaController(MediaStorageService storageService) {
        this.storageService = storageService;
    }

    /**
     * Endpoint para subida de imágenes comprimidas desde el cliente mediante multipart/form-data.
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadMultipart(@RequestParam("file") MultipartFile file) {
        try {
            String filename = storageService.store(file);
            String url = "/api/v1/media/" + filename;
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "filename", filename,
                    "url", url
            ));
        } catch (Exception e) {
            log.error("Fallo al subir imagen multipart: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "No se pudo almacenar la imagen"));
        }
    }

    /**
     * Endpoint alternativo para subida de imágenes en Base64.
     */
    @PostMapping(value = "/upload-base64")
    public ResponseEntity<?> uploadBase64(@RequestBody Map<String, String> payload) {
        try {
            String base64Data = payload.get("data");
            if (base64Data == null || base64Data.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Campo 'data' requerido con la imagen en Base64"));
            }
            String filename = storageService.storeBase64(base64Data);
            String url = "/api/v1/media/" + filename;
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "filename", filename,
                    "url", url
            ));
        } catch (Exception e) {
            log.error("Fallo al subir imagen base64: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "No se pudo procesar la imagen Base64"));
        }
    }

    /**
     * Entrega la imagen con cabeceras de caché HTTP para no saturar peticiones.
     */
    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        Resource file = storageService.loadAsResource(filename);
        if (file == null) {
            return ResponseEntity.notFound().build();
        }

        MediaType mediaType = MediaType.IMAGE_JPEG;
        if (filename.toLowerCase().endsWith(".png")) {
            mediaType = MediaType.IMAGE_PNG;
        }

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(file);
    }
}
