describe("landing flow", () => {
	it("should load", () => {
		cy.visit("http://localhost:53422");
		cy.contains("All in one place.").should("be.visible");
	});
});
