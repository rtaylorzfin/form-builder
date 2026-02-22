package com.formbuilder.page;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FormPageRepository extends JpaRepository<FormPage, UUID> {

    List<FormPage> findByFormIdOrderByPageNumberAsc(UUID formId);

    Optional<FormPage> findByIdAndFormId(UUID id, UUID formId);

    Optional<FormPage> findFirstByFormIdOrderByPageNumberAsc(UUID formId);

    @Query("SELECT COALESCE(MAX(p.pageNumber), -1) FROM FormPage p WHERE p.form.id = :formId")
    Integer findMaxPageNumber(UUID formId);

    int countByFormId(UUID formId);
}
