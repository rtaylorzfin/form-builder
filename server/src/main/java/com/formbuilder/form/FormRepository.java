package com.formbuilder.form;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FormRepository extends JpaRepository<Form, UUID> {

    List<Form> findAllByOrderByUpdatedAtDesc();

    List<Form> findByStatusOrderByUpdatedAtDesc(FormStatus status);

    @Query("SELECT f FROM Form f LEFT JOIN FETCH f.elements WHERE f.id = :id")
    Optional<Form> findByIdWithElements(UUID id);

    @Query("SELECT f FROM Form f LEFT JOIN FETCH f.elements WHERE f.id = :id AND f.status = 'PUBLISHED'")
    Optional<Form> findPublishedByIdWithElements(UUID id);
}
