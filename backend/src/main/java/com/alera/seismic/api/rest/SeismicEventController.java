package com.alera.seismic.api.rest;

import com.alera.seismic.api.dto.NearbySeismicEventResponseDto;
import com.alera.seismic.api.dto.SeismicEventResponseDto;
import com.alera.seismic.domain.model.SeismicEvent;
import com.alera.seismic.domain.port.in.GetNearbySeismicEventsUseCase;
import com.alera.seismic.domain.port.in.GetRecentSeismicEventsUseCase;
import com.alera.seismic.domain.port.in.GetSeismicEventByIdUseCase;
import com.alera.shared.api.dto.ApiResponse;
import com.alera.shared.domain.Coordinates;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/seismic-events")
public class SeismicEventController {

    private final GetRecentSeismicEventsUseCase getRecentSeismicEventsUseCase;
    private final GetSeismicEventByIdUseCase getSeismicEventByIdUseCase;
    private final GetNearbySeismicEventsUseCase getNearbySeismicEventsUseCase;

    public SeismicEventController(GetRecentSeismicEventsUseCase getRecentSeismicEventsUseCase,
                                  GetSeismicEventByIdUseCase getSeismicEventByIdUseCase,
                                  GetNearbySeismicEventsUseCase getNearbySeismicEventsUseCase) {
        this.getRecentSeismicEventsUseCase = Objects.requireNonNull(getRecentSeismicEventsUseCase, "GetRecentSeismicEventsUseCase no puede ser nulo");
        this.getSeismicEventByIdUseCase = Objects.requireNonNull(getSeismicEventByIdUseCase, "GetSeismicEventByIdUseCase no puede ser nulo");
        this.getNearbySeismicEventsUseCase = Objects.requireNonNull(getNearbySeismicEventsUseCase, "GetNearbySeismicEventsUseCase no puede ser nulo");
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SeismicEventResponseDto>>> getRecentEvents(
            @RequestParam(name = "limit", defaultValue = "20") int limit) {

        List<SeismicEventResponseDto> events = getRecentSeismicEventsUseCase.execute(limit)
                .stream()
                .map(SeismicEventResponseDto::fromDomain)
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(events));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SeismicEventResponseDto>> getEventById(@PathVariable UUID id) {
        SeismicEvent event = getSeismicEventByIdUseCase.execute(id);
        return ResponseEntity.ok(ApiResponse.ok(SeismicEventResponseDto.fromDomain(event)));
    }

    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<List<NearbySeismicEventResponseDto>>> getNearbyEvents(
            @RequestParam(name = "lat") double lat,
            @RequestParam(name = "lon") double lon,
            @RequestParam(name = "radiusKm", defaultValue = "150.0") double radiusKm,
            @RequestParam(name = "limit", defaultValue = "20") int limit) {

        // Validacion automatica de coordenadas en la frontera HTTP
        Coordinates userLocation = new Coordinates(lat, lon);

        List<NearbySeismicEventResponseDto> nearbyEvents = getNearbySeismicEventsUseCase
                .execute(userLocation, radiusKm, limit)
                .stream()
                .map(NearbySeismicEventResponseDto::fromDomain)
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(nearbyEvents));
    }
}