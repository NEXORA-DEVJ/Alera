package com.alera.notifications.api.rest;

import com.alera.notifications.api.dto.DispatchAlertsResponseDto;
import com.alera.notifications.domain.port.in.DispatchSeismicAlertsUseCase;
import com.alera.notifications.domain.port.in.SeismicAlertDispatchResult;
import com.alera.shared.api.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/seismic-events")
public class SeismicAlertController {

    private final DispatchSeismicAlertsUseCase dispatchAlertsUseCase;

    public SeismicAlertController(DispatchSeismicAlertsUseCase dispatchAlertsUseCase) {
        this.dispatchAlertsUseCase = Objects.requireNonNull(dispatchAlertsUseCase, "DispatchSeismicAlertsUseCase no puede ser nulo");
    }

    @PostMapping("/{id}/dispatch-alerts")
    public ResponseEntity<ApiResponse<DispatchAlertsResponseDto>> dispatchAlerts(
            @PathVariable("id") UUID id) {

        SeismicAlertDispatchResult result = dispatchAlertsUseCase.dispatchForEvent(id);

        return ResponseEntity.ok(ApiResponse.ok(DispatchAlertsResponseDto.fromResult(result)));
    }
}