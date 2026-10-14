package com.alera.community.api.rest;

import com.alera.community.api.dto.CommunityIncidentResponseDto;
import com.alera.community.api.dto.ConfirmIncidentRequestDto;
import com.alera.community.api.dto.CreateIncidentRequestDto;
import com.alera.community.api.dto.NearbyCommunityIncidentResponseDto;
import com.alera.community.application.CommunityIncidentService;
import com.alera.community.domain.model.CommunityIncident;
import com.alera.shared.api.dto.ApiResponse;
import com.alera.shared.domain.Coordinates;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/community-incidents")
public class CommunityIncidentController {

    private final CommunityIncidentService incidentService;

    public CommunityIncidentController(CommunityIncidentService incidentService) {
        this.incidentService = Objects.requireNonNull(incidentService, "CommunityIncidentService no puede ser nulo");
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CommunityIncidentResponseDto>> reportIncident(
            @Valid @RequestBody CreateIncidentRequestDto request) {

        Coordinates coordinates = new Coordinates(request.latitude(), request.longitude());
        CommunityIncident incident = incidentService.createIncident(
                request.reporterDeviceId(),
                request.toIncidentType(),
                request.description(),
                coordinates,
                request.getEffectiveRadius()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(CommunityIncidentResponseDto.fromDomain(incident)));
    }

    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<List<NearbyCommunityIncidentResponseDto>>> getNearbyIncidents(
            @RequestParam("lat") double lat,
            @RequestParam("lon") double lon,
            @RequestParam(name = "radiusMeters", defaultValue = "5000") double radiusMeters) {

        Coordinates center = new Coordinates(lat, lon);
        List<NearbyCommunityIncidentResponseDto> incidents = incidentService.getNearbyIncidents(center, radiusMeters)
                .stream()
                .map(NearbyCommunityIncidentResponseDto::fromDomain)
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(incidents));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CommunityIncidentResponseDto>> getIncidentById(
            @PathVariable("id") UUID id) {

        CommunityIncident incident = incidentService.getIncidentById(id);
        return ResponseEntity.ok(ApiResponse.ok(CommunityIncidentResponseDto.fromDomain(incident)));
    }

    @PostMapping("/{id}/confirmations")
    public ResponseEntity<ApiResponse<CommunityIncidentResponseDto>> confirmIncident(
            @PathVariable("id") UUID id,
            @Valid @RequestBody ConfirmIncidentRequestDto request) {

        CommunityIncident updated = incidentService.confirmIncident(
                id,
                request.deviceId(),
                request.toVoteType()
        );

        return ResponseEntity.ok(ApiResponse.ok(CommunityIncidentResponseDto.fromDomain(updated)));
    }
}