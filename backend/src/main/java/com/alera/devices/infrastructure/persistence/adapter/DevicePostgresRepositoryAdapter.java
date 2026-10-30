package com.alera.devices.infrastructure.persistence.adapter;

import com.alera.devices.domain.model.Device;
import com.alera.devices.domain.port.out.DeviceRepositoryPort;
import com.alera.devices.infrastructure.persistence.entity.DeviceJpaEntity;
import com.alera.devices.infrastructure.persistence.mapper.DeviceMapper;
import com.alera.devices.infrastructure.persistence.repository.DeviceSpringDataJpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Repository
public class DevicePostgresRepositoryAdapter implements DeviceRepositoryPort {

    private final DeviceSpringDataJpaRepository jpaRepository;
    private final DeviceMapper mapper;

    public DevicePostgresRepositoryAdapter(DeviceSpringDataJpaRepository jpaRepository, DeviceMapper mapper) {
        this.jpaRepository = Objects.requireNonNull(jpaRepository, "DeviceSpringDataJpaRepository no puede ser nulo");
        this.mapper = Objects.requireNonNull(mapper, "DeviceMapper no puede ser nulo");
    }

    @Override
    public Device save(Device device) {
        DeviceJpaEntity entityToSave = mapper.toJpaEntity(device);
        DeviceJpaEntity savedEntity = jpaRepository.save(entityToSave);
        return mapper.toDomain(savedEntity);
    }

    @Override
    public Optional<Device> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<Device> findByFcmToken(String fcmToken) {
        return jpaRepository.findByFcmToken(fcmToken).map(mapper::toDomain);
    }

    @Override
    public java.util.List<Device> findAllById(Iterable<UUID> ids) {
        return jpaRepository.findAllById(ids).stream().map(mapper::toDomain).toList();
    }
}