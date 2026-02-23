package com.formbuilder.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PromoteAdminRunner implements ApplicationRunner {

    private final UserRepository userRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (!args.containsOption("promote-admin")) {
            return;
        }

        var values = args.getOptionValues("promote-admin");
        if (values == null || values.isEmpty()) {
            System.err.println("Usage: --promote-admin=<email>");
            System.exit(1);
        }

        String email = values.get(0);
        var user = userRepository.findByEmail(email);
        if (user.isEmpty()) {
            System.err.println("User not found: " + email);
            System.exit(1);
        }

        User u = user.get();
        if (u.getRole() == UserRole.ADMIN) {
            System.out.println("User " + email + " is already ADMIN");
        } else {
            u.setRole(UserRole.ADMIN);
            userRepository.save(u);
            System.out.println("Promoted " + email + " to ADMIN");
        }

        System.exit(0);
    }
}
