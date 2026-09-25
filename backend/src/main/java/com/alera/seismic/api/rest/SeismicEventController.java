package com.alera.seismic.api.rest;

import com.alera.seismic.api.dto.SeismicEventResponseDto;
import com.alera.seismic.domain.port.in.GetRecentSeismicEventsUseCase;
import com.alera.shared.api.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1/seismic-events")
public class SeismicEventController {

    private final GetRecentSeismicEventsUseCase getRecentSeismicEventsUseCase;

    public SeismicEventController(GetRecentSeismicEventsUseCase getRecentSeismicEventsUseCase) {
        this.getRecentSeismicEventsUseCase = Objects.requireNonNull(getRecentSeismicEventsUseCase, "UseCase no puede ser nulo");
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
}