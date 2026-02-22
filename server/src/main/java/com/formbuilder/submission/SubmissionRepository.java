package com.formbuilder.submission;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {

    Page<Submission> findByFormIdOrderBySubmittedAtDesc(UUID formId, Pageable pageable);

    List<Submission> findByFormIdOrderBySubmittedAtDesc(UUID formId);

    int countByFormId(UUID formId);
}
