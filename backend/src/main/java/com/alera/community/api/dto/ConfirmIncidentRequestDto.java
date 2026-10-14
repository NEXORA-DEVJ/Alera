package com.alera.community.api.dto;

import com.alera.community.domain.model.ConfirmationVoteType;
import com.alera.shared.domain.DomainException;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ConfirmIncidentRequestDto(
        @NotNull(message = "El deviceId es obligatorio")
        UUID deviceId,

        @NotBlank(message = "El voteType es obligatorio (STILL_ACTIVE o RESOLVED)")
        String voteType
) {
    public ConfirmationVoteType toVoteType() {
        try {
            return ConfirmationVoteType.valueOf(voteType.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException("Tipo de voto invalido: " + voteType + ". Valores validos: STILL_ACTIVE, RESOLVED");
        }
    }
}