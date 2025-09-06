export const breakpoints = {
	small: 576,
	medium: 768,
	large: 992,
	xlarge: 1200,
	xxlarge: 1400,
	xxxlarge: 1600,
};

type MediaQueries = {
	[key: string]: string;
};

export const mediaQueries: MediaQueries = {
	smallOnly: `@media screen and (max-width: ${breakpoints.small - 1}px)`,
	mediumOnly: `@media screen and (min-width: ${
		breakpoints.small
	}px) and (max-width: ${breakpoints.medium - 1}px)`,
	largeOnly: `@media screen and \
        (min-width: ${breakpoints.medium}px) and \
        (max-width: ${breakpoints.large - 1}px)`,
	xlargeOnly: `@media screen and (min-width: ${
		breakpoints.large
	}px) and (max-width: ${breakpoints.xlarge - 1}px)`,
	xxlargeOnly: `@media screen and (min-width: ${
		breakpoints.xlarge
	}px) and (max-width: ${breakpoints.xxlarge - 1}px)`,
	xxxlargeOnly: `@media screen and (min-width: ${
		breakpoints.xxlarge
	}px) and (max-width: ${breakpoints.xxxlarge - 1}px)`,
	small: `@media screen and (min-width: ${breakpoints.small}px)`,
	medium: `@media screen and (min-width: ${breakpoints.medium}px)`,
	large: `@media screen and (min-width: ${breakpoints.large}px)`,
	xlarge: `@media screen and (min-width: ${breakpoints.xlarge}px)`,
	xxlarge: `@media screen and (min-width: ${breakpoints.xxlarge}px)`,
	xxxlarge: `@media screen and (min-width: ${breakpoints.xxxlarge}px)`,
	belowMedium: `@media screen and (max-width: ${breakpoints.medium - 1}px)`,
};
