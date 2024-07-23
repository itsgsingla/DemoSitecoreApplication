using Demo.Foundation.ORM.Models;
using Glass.Mapper.Sc.Configuration.Attributes;
using System;

namespace Demo.Feature.NewsListing.Models
{
    [SitecoreType(TemplateId = TemplateIdConstants.NewsConstants.TemplateId)]
    public interface INews : IGlassBase
    {
        [SitecoreField(FieldId = TemplateIdConstants.NewsConstants.TitleId)]
        string Title { get; set; }

        [SitecoreField(FieldId = TemplateIdConstants.NewsConstants.DescriptionId)]
        string Description { get; set; }

        [SitecoreField(FieldId = TemplateIdConstants.NewsConstants.PublishDateId)]
        DateTime PublishDate { get; set; }

		[SitecoreField(FieldId = TemplateIdConstants.NewsConstants.CategoryId)]
		INewsCategory NewsCategory { get; set; }
	}
}
