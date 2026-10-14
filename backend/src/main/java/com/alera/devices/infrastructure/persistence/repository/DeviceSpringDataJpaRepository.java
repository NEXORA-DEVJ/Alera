package com.alera.devices.infrastructure.persistence.repository;

import com.alera.devices.infrastructure.persistence.entity.DeviceJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeviceSpringDataJpaRepository extends JpaRepository<DeviceJpaEntity, UUID> {

    Optional<DeviceJpaEntity> findByFcmToken(String fcmToken);
}