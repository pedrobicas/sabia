package com.pedrobicas.sabia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SabiaApplication {

    public static void main(String[] args) {
        SpringApplication.run(SabiaApplication.class, args);
    }
}
