package com.alera.devices.infrastructure.persistence.mapper;

import com.alera.devices.domain.model.Device;
import com.alera.devices.domain.model.Platform;
import com.alera.devices.infrastructure.persistence.entity.DeviceJpaEntity;
import org.springframework.stereotype.Component;

@Component
public class DeviceMapper {

    public DeviceJpaEntity toJpaEntity(Device domain) {
        if (domain == null) {
            return null;
        }

        return new DeviceJpaEntity(
                domain.getId(),
                domain.getUserId(),
                domain.getFcmToken(),
                domain.getPlatform().name(),
                domain.isActive(),
                domain.getLastSeenAt(),
                domain.getCreatedAt(),
                domain.getUpdatedAt()
        );
    }

    public Device toDomain(DeviceJpaEntity entity) {
        if (entity == null) {
            return null;
        }

        return Device.reconstitute(
                entity.getId(),
                entity.getUserId(),
                entity.getFcmToken(),
                Platform.valueOf(entity.getPlatform()),
                entity.isActive(),
                entity.getLastSeenAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}