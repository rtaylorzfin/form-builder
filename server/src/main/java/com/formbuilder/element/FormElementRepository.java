package com.formbuilder.element;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FormElementRepository extends JpaRepository<FormElement, UUID> {

    List<FormElement> findByFormIdOrderBySortOrderAsc(UUID formId);

    Optional<FormElement> findByIdAndFormId(UUID id, UUID formId);

    @Query("SELECT COALESCE(MAX(e.sortOrder), -1) FROM FormElement e WHERE e.form.id = :formId")
    Integer findMaxSortOrder(UUID formId);

    @Modifying
    @Query("DELETE FROM FormElement e WHERE e.form.id = :formId")
    void deleteAllByFormId(UUID formId);

    int countByFormId(UUID formId);
}
